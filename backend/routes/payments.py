"""
Payments routes: /payments/*, /webhook/stripe
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


async def create_stripe_session(user: dict, tariff: dict, tariff_id: str, origin_url: str, base_url: str) -> dict:
    webhook_url = f"{base_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(
        api_key=os.environ["STRIPE_API_KEY"],
        webhook_url=webhook_url,
    )
    checkout_req = CheckoutSessionRequest(
        amount=float(tariff["price"]),
        currency="usd",
        success_url=f"{origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin_url}/tariffs",
        metadata={
            "user_id": user["_id"],
            "tariff_id": tariff_id,
            "email": user.get("email", ""),
        },
    )
    session = await stripe_checkout.create_checkout_session(checkout_req)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["_id"],
        "tariff_id": tariff_id,
        "amount": tariff["price"],
        "currency": "usd",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}


async def activate_paid_tariff(user_id: str, tariff_id: str, session_id: str) -> None:
    tariff = TARIFFS[tariff_id]
    expires_map = {"week": timedelta(days=7), "month": timedelta(days=30)}
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
        {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}},
    )


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
    host_url = str(request.base_url).rstrip("/")
    return await create_stripe_session(user, tariff, req.tariff_id, req.origin_url, host_url)


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
        return {"status": "paid", "payment_status": "paid"}

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(
        api_key=os.environ["STRIPE_API_KEY"],
        webhook_url=webhook_url,
    )
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        if status.payment_status == "paid" and tx.get("payment_status") != "paid":
            await activate_paid_tariff(user["_id"], tx["tariff_id"], session_id)
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
        }
    except Exception as e:
        logger.error(f"Payment status error: {e}")
        raise HTTPException(500, str(e))


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    try:
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}api/webhook/stripe"
        stripe_checkout = StripeCheckout(
            api_key=os.environ["STRIPE_API_KEY"],
            webhook_url=webhook_url,
        )
        event = await stripe_checkout.handle_webhook(body, signature)
        logger.info(f"Stripe webhook: {event.event_type}")
        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"received": False}
