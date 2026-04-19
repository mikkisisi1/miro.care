import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMonthName, getWeekdayLabels } from '@/contexts/translations-extra';
import { ArrowLeft, Check, X } from 'lucide-react';
import apiClient from '@/lib/apiClient';

export default function BookingCalendar() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [calendar, setCalendar] = useState([]);
  const [price, setPrice] = useState(200);
  const [advancePercent, setAdvancePercent] = useState(50);
  const [selectedDay, setSelectedDay] = useState(null);
  const [booking, setBooking] = useState(false);

  const loadSlots = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/bookings/slots');
      setCalendar(data.calendar);
      setPrice(data.price);
      setAdvancePercent(data.advance_percent);
    } catch {
      if (process.env.NODE_ENV === 'development') console.error('Failed to load booking slots');
    }
  }, []);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const handleBook = async (date, timeSlot) => {
    if (booking) return;
    setBooking(true);
    try {
      await apiClient.post('/bookings/book', { date, time_slot: timeSlot });
      await loadSlots();
    } catch (err) {
      const detail = err.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : t('bookingFailed'));
    } finally {
      setBooking(false);
    }
  };

  const monthName = calendar.length > 0
    ? getMonthName(lang, new Date(calendar[0].date).getMonth())
    : '';
  const year = calendar.length > 0 ? new Date(calendar[0].date).getFullYear() : '';
  const wdLabels = getWeekdayLabels(lang);

  return (
    <div className="booking-page" data-testid="booking-page">
      <header className="booking-header">
        <button data-testid="booking-back-btn" onClick={() => navigate(-1)} className="booking-back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="booking-title">{t('bookPsychologist')}</h1>
          <p className="booking-subtitle">{monthName} {year}</p>
        </div>
      </header>

      <div className="booking-info">
        <span className="booking-price">${price}/{t('perHour')}</span>
        <span className="booking-advance">{t('advance')}: {advancePercent}% (${price * advancePercent / 100})</span>
      </div>

      <div className="booking-legend">
        <span className="legend-item"><span className="legend-dot legend-available" /> {t('available')}</span>
        <span className="legend-item"><span className="legend-dot legend-booked" /> {t('booked')}</span>
        <span className="legend-item"><span className="legend-dot legend-own" /><Check size={12} /> {t('yours')}</span>
      </div>

      <div className="booking-weekday-row">
        {wdLabels.map(d => <span key={d} className="booking-weekday-label">{d}</span>)}
      </div>

      <div className="booking-grid" data-testid="booking-grid">
        {calendar.map(day => {
          const d = new Date(day.date);
          const dayNum = d.getDate();
          const hasOwn = day.slots.some(s => s.status === 'own');
          const allBooked = day.slots.every(s => s.status !== 'available');
          const isSelected = selectedDay === day.date;

          return (
            <div key={day.date} className="booking-day-wrapper" style={{ gridColumn: day.weekday + 1 }}>
              <button
                className={`booking-day ${allBooked ? 'booking-day-full' : ''} ${hasOwn ? 'booking-day-own' : ''} ${isSelected ? 'booking-day-selected' : ''}`}
                onClick={() => setSelectedDay(isSelected ? null : day.date)}
                data-testid={`booking-day-${day.date}`}
              >
                <span className="booking-day-num">{dayNum}</span>
                {hasOwn && <Check size={12} className="booking-own-check" />}
              </button>

              {isSelected && (
                <div className="booking-slots-dropdown" data-testid="booking-slots">
                  {day.slots.map(slot => (
                    <button
                      key={slot.time}
                      className={`booking-slot booking-slot-${slot.time === selectedDay ? 'selected' : slot.status}`}
                      disabled={slot.status !== 'available' || booking}
                      onClick={() => handleBook(day.date, slot.time)}
                      data-testid={`slot-${day.date}-${slot.time}`}
                    >
                      <span>{slot.time}</span>
                      {slot.status === 'booked' && <X size={12} />}
                      {slot.status === 'own' && <Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="booking-tz">{t('timeLabel')}</p>
    </div>
  );
}
