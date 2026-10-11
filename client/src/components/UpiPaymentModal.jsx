import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, Loader2, Smartphone, Scan, ArrowRight, ShieldCheck } from 'lucide-react';

// Real UPI VPA
const CAMPUS_UPI_VPA = 'vishnuknavaneeth7@oksbi';

export function UpiPaymentModal({ isOpen, onClose, cart, cartTotal, canteenName, onConfirm }) {
  const [step, setStep] = useState('qr'); // 'qr' | 'processing' | 'done'
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef(null);

  const qrValue = `upi://pay?pa=${CAMPUS_UPI_VPA}&pn=Amrita+Smart+Canteen&am=${cartTotal}&cu=INR&tn=${encodeURIComponent('Order at ' + canteenName)}&tr=TXN_${Date.now()}`;

  useEffect(() => {
    if (!isOpen) {
      setStep('qr');
      setCountdown(5);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen]);

  const handleConfirmPayment = () => {
    setStep('processing');
    let t = 0;
    timerRef.current = setInterval(() => {
      t += 1;
      if (t >= 2) {
        clearInterval(timerRef.current);
        setStep('done');
        // Trigger the actual order creation after the 'done' animation
        setTimeout(() => {
          onConfirm();
        }, 800);
      }
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200">
              <Smartphone className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Pay via UPI</h3>
              <p className="text-[11px] text-slate-500">Scan with any UPI app</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {step === 'qr' && (
            <div className="flex flex-col items-center gap-4">
              {/* Amount badge */}
              <div className="w-full flex items-center justify-between bg-slate-50 border border-[#E8E3D7] rounded-2xl p-3">
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">{canteenName}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {cart.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                  </p>
                </div>
                <span className="font-black text-[#B0003A] text-lg font-mono">₹{cartTotal}</span>
              </div>

              {/* Real UPI QR Code */}
              <div className="relative p-3 bg-white border-2 border-[#E8E3D7] rounded-2xl shadow-inner">
                <img
                  src="/upi-qr.jpg"
                  alt="Scan to pay via UPI"
                  className="w-48 h-48 object-contain rounded-xl"
                />
              </div>

              {/* UPI VPA */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Scan className="w-3.5 h-3.5 text-slate-400" />
                <span>UPI ID: <strong className="text-slate-800 font-mono">{CAMPUS_UPI_VPA}</strong></span>
              </div>

              {/* App logos row */}
              <div className="flex items-center gap-3">
                {[
                  { name: 'GPay', color: '#4285F4', letter: 'G' },
                  { name: 'PhonePe', color: '#5F259F', letter: 'P' },
                  { name: 'Paytm', color: '#00B9F1', letter: 'T' },
                  { name: 'BHIM', color: '#00873D', letter: 'B' },
                ].map((app) => (
                  <div key={app.name} className="flex flex-col items-center gap-1">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm"
                      style={{ backgroundColor: app.color }}
                    >
                      {app.letter}
                    </div>
                    <span className="text-[9px] text-slate-500 font-medium">{app.name}</span>
                  </div>
                ))}
              </div>

              {/* Confirm button */}
              <button
                onClick={handleConfirmPayment}
                className="w-full py-3.5 rounded-2xl bg-[#B0003A] hover:bg-[#8F002E] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-[#B0003A]/20 transition active:scale-[0.98]"
              >
                <CheckCircle className="w-4 h-4" />
                I've Paid · Confirm Order
              </button>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  Secured by <strong className="text-slate-700">Amrita Smart Canteen Pay</strong> · TLS encrypted
                </span>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-900 text-sm">Verifying Payment…</p>
                <p className="text-xs text-slate-500 mt-1">Connecting to UPI gateway</p>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="font-black text-emerald-700 text-base">Payment Successful!</p>
                <p className="text-xs text-slate-500 mt-1">Placing your order…</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
