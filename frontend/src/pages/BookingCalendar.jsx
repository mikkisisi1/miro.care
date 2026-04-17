import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WEEKDAYS = { en: ['Mon','Tue','Wed','Thu','Fri'], ru: ['Пн','Вт','Ср','Чт','Пт'] };
const MONTHS = {
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  ru: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
};

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
      const token = localStorage.getItem('access_token');
      const { data } = await axios.get(`${API}/bookings/slots`, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
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
      const token = localStorage.getItem('access_token');
      await axios.post(`${API}/bookings/book`, { date, time_slot: timeSlot }, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await loadSlots();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Booking failed';
      alert(typeof detail === 'string' ? detail : 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  // Group calendar by weeks for grid layout
  const monthName = calendar.length > 0
    ? (MONTHS[lang] || MONTHS.en)[new Date(calendar[0].date).getMonth()]
    : '';
  const year = calendar.length > 0 ? new Date(calendar[0].date).getFullYear() : '';
  const wdLabels = WEEKDAYS[lang] || WEEKDAYS.en;

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
        <span className="booking-price">${price}/{lang === 'ru' ? 'час' : 'hr'}</span>
        <span className="booking-advance">{t('advance') || 'Advance'}: {advancePercent}% (${price * advancePercent / 100})</span>
      </div>

      <div className="booking-legend">
        <span className="legend-item"><span className="legend-dot legend-available" /> {lang === 'ru' ? 'Свободно' : 'Available'}</span>
        <span className="legend-item"><span className="legend-dot legend-booked" /> {lang === 'ru' ? 'Занято' : 'Booked'}</span>
        <span className="legend-item"><span className="legend-dot legend-own" /><Check size={12} /> {lang === 'ru' ? 'Ваше' : 'Yours'}</span>
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
                      className={`booking-slot booking-slot-${slot.status}`}
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

      <p className="booking-tz">{lang === 'ru' ? 'Время: Москва (UTC+3)' : 'Time: Moscow (UTC+3)'}</p>
    </div>
  );
}
