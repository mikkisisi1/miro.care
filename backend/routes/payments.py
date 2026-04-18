"""
Payments routes: /payments/*, /webhook/stripe
Full Stripe integration with webhooks and polling.
"""
import os
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from bson import ObjectId
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

from database import db
from auth_utils import get_current_user
from config import TARIFFS

logger = logging.getLogger(__name__)
router = APIRouter()


class CheckoutRequest(BaseModel):
    tariff_id: str
    origin_url: str


def _get_stripe_checkout(request: Request) -> StripeCheckout:
    host_url = str(request.base_url).rstrip("/") + "/"
    webhook_url = f"{host_url}api/webhook/stripe"
    return StripeCheckout(
        api_key=os.environ["STRIPE_API_KEY"],
        webhook_url=webhook_url,
    )


# ---------- HELPERS ----------
async def activate_test_tariff(user_id: str) -> dict:
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "tariff": "test",
            "minutes_total": 3,
            "minutes_used": 0,
            "minutes_left": 3,
            "test_used": True,
            "tariff_expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "is_paid_session_active": True,
        }},
    )
    return {"type": "test_activated", "message": "Test tariff activated"}


async def activate_paid_tariff(user_id: str, tariff_id: str, session_id: str) -> bool:
    """Activate tariff for user. Returns True if activated, False if already processed."""
    tx = await db.payment_transactions.find_one({"session_id": session_id})
    if not tx:
        logger.warning(f"No transaction found for session {session_id}")
        return False
    if tx.get("payment_status") == "paid":
        logger.info(f"Session {session_id} already processed, skipping duplicate activation")
        return False

    tariff = TARIFFS.get(tariff_id)
    if not tariff:
        logger.error(f"Unknown tariff_id: {tariff_id}")
        return False

    expires_map = {"hour": timedelta(days=1), "week": timedelta(days=7), "month": timedelta(days=30)}
    expires = expires_map.get(tariff_id, timedelta(days=1))

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "tariff": tariff_id,
            "minutes_total": tariff["minutes"],
            "minutes_used": 0,
            "minutes_left": tariff["minutes"],
            "tariff_expires_at": (datetime.now(timezone.utc) + expires).isoformat(),
            "is_paid_session_active": True,
        }},
    )

    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "payment_status": "paid",
            "paid_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    logger.info(f"Tariff '{tariff_id}' activated for user {user_id} (session {session_id})")
    return True


# ---------- ENDPOINTS ----------
@router.post("/payments/create-checkout")
async def create_checkout(req: CheckoutRequest, request: Request):
    user = await get_current_user(request)
    tariff = TARIFFS.get(req.tariff_id)
    if not tariff:
        raise HTTPException(400, "Invalid tariff")

    if req.tariff_id == "test":
        if user.get("test_used"):
            raise HTTPException(400, "Test tariff already used")
        return await activate_test_tariff(user["_id"])

    stripe_checkout = _get_stripe_checkout(request)
    checkout_req = CheckoutSessionRequest(
        amount=float(tariff["price"]),
        currency="usd",
        success_url=f"{req.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{req.origin_url}/tariffs",
        metadata={
            "user_id": user["_id"],
            "tariff_id": req.tariff_id,
            "email": user.get("email", ""),
        },
    )
    session = await stripe_checkout.create_checkout_session(checkout_req)

    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["_id"],
        "tariff_id": req.tariff_id,
        "amount": float(tariff["price"]),
        "currency": "usd",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"url": session.url, "session_id": session.session_id}


@router.get("/payments/status/{session_id}")
async def check_payment_status(session_id: str, request: Request):
    user = await get_current_user(request)
    tx = await db.payment_transactions.find_one(
        {"session_id": session_id, "user_id": user["_id"]},
        {"_id": 0},
    )
    if not tx:
        raise HTTPException(404, "Transaction not found")

    if tx.get("payment_status") == "paid":
        return {"status": "complete", "payment_status": "paid"}

    try:
        stripe_checkout = _get_stripe_checkout(request)
        status = await stripe_checkout.get_checkout_status(session_id)

        if status.payment_status == "paid":
            await activate_paid_tariff(user["_id"], tx["tariff_id"], session_id)
            return {"status": "complete", "payment_status": "paid"}

        if status.status == "expired":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "expired"}},
            )
            return {"status": "expired", "payment_status": "expired"}

        return {
            "status": status.status,
            "payment_status": status.payment_status,
        }
    except Exception as e:
        logger.warning(f"Stripe status check failed for {session_id}: {e}")
        return {
            "status": "pending",
            "payment_status": tx.get("payment_status", "pending"),
        }


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    try:
        stripe_checkout = _get_stripe_checkout(request)
        event = await stripe_checkout.handle_webhook(body, signature)
        logger.info(f"Stripe webhook event: {event.event_type}, session: {event.session_id}, status: {event.payment_status}")

        if event.payment_status == "paid" and event.session_id:
            metadata = event.metadata or {}
            user_id = metadata.get("user_id")
            tariff_id = metadata.get("tariff_id")

            if user_id and tariff_id:
                activated = await activate_paid_tariff(user_id, tariff_id, event.session_id)
                if activated:
                    logger.info(f"Webhook activated tariff '{tariff_id}' for user {user_id}")
            else:
                logger.warning(f"Webhook missing metadata: user_id={user_id}, tariff_id={tariff_id}")

        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        return {"received": False, "error": str(e)}
