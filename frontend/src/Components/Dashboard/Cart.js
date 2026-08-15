import React, { useState, useEffect } from 'react';
import { Trash2, ArrowLeft, Star, ShoppingCart } from 'lucide-react';

const Cart = ({ onBack, onCheckoutSuccess, onCheckout }) => {
  const [cartItems, setCartItems] = useState([]);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('sf_cart') || '[]');
    setCartItems(savedCart);
  }, []);

  const handleRemove = (courseId) => {
    const updatedCart = cartItems.filter(item => item.id !== courseId);
    setCartItems(updatedCart);
    localStorage.setItem('sf_cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('cart_updated'));
  };

  const totalPrice = cartItems.length * 49.99; // Mock price $49.99 per course

  const mockCartCourseForPayment = {
    id: 'cart_checkout',
    title: `SkillForge Cart (${cartItems.length} items)`,
    is_ai_generated: false,
    image_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=200',
    price: `$${totalPrice.toFixed(2)}`
  };

  const handlePaymentSuccess = () => {
    // Enroll in all cart courses
    const enrolled = JSON.parse(localStorage.getItem('sf_enrolled_courses') || '[]');
    const newEnrolled = [...enrolled, ...cartItems.map(c => c.id)];
    // deduplicate just in case
    const uniqueEnrolled = [...new Set(newEnrolled)];
    localStorage.setItem('sf_enrolled_courses', JSON.stringify(uniqueEnrolled));

    // Clear cart
    localStorage.removeItem('sf_cart');
    setCartItems([]);
    window.dispatchEvent(new Event('cart_updated'));
    window.dispatchEvent(new Event('progress_updated'));

    setShowPayment(false);
    
    alert('Payment successful! You are now enrolled in all courses.');
    if (onCheckoutSuccess) {
      onCheckoutSuccess();
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-sm p-10 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-300">
            <ShoppingCart size={48} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-navy-900 mb-3">Your cart is empty!</h2>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">
            Explore our wide range of courses and start your learning journey today.
          </p>
          <button 
            className="px-8 py-3 bg-navy hover:bg-navy-800 text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 w-full sm:w-auto"
            onClick={onBack}
          >
            Shop Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <button 
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy-900 transition-colors mb-6 group"
          onClick={onBack}
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Continue Shopping
        </button>
        <h1 className="text-3xl font-bold text-navy-900 mb-8">Shopping Cart</h1>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Cart Items Section */}
          <div className="flex-1 w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-navy-900">My Cart ({cartItems.length})</h3>
            </div>
            <div className="flex flex-col">
              {cartItems.map((course) => (
                <div key={course.id} className="flex flex-col sm:flex-row gap-6 p-6 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group">
                  <div className="w-full sm:w-40 h-28 shrink-0 rounded-xl overflow-hidden shadow-sm border border-slate-100">
                    <img 
                      src={course.image_url ? (course.image_url.startsWith('http') ? course.image_url : `${process.env.REACT_APP_API_URL || ''}${course.image_url}`) : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'} 
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-navy-900 mb-1 leading-tight line-clamp-2">{course.title}</h3>
                    <p className="text-sm font-medium text-slate-500 mb-2">{course.is_ai_generated ? "SkillForge AI" : "Domain Expert"}</p>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-4">
                      <span className="flex items-center gap-1 text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                        <Star size={12} className="fill-amber-500" /> {course.rating}
                      </span>
                      <span>•</span>
                      <span>{course.students_count} students</span>
                    </div>
                    <div className="flex gap-4 mt-auto">
                      <button 
                        className="flex items-center gap-1.5 text-xs font-bold text-coral hover:text-coral-hover hover:bg-coral-50 px-2 py-1 -ml-2 rounded transition-colors"
                        onClick={() => handleRemove(course.id)}
                      >
                        <Trash2 size={16} /> Remove
                      </button>
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0 flex items-center sm:items-start pt-1">
                    <span className="text-2xl font-bold text-navy-900">$49.99</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Section */}
          <div className="w-full lg:w-96 shrink-0 flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-xl font-bold text-navy-900 mb-6">Price Details</h3>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-slate-500">Price ({cartItems.length} items)</span>
                  <span className="text-navy-900">${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-slate-500">Discount</span>
                  <span className="text-emerald-500">-$0.00</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-xl font-bold text-navy-900 py-5 border-t border-b border-slate-100 mb-6">
                <span>Total Amount</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              
              <div className="text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl text-center mb-6">
                You will save $0.00 on this order
              </div>
              
              <button 
                className="w-full py-4 bg-navy hover:bg-navy-800 text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50 text-base"
                onClick={() => {
                  if (onCheckout) {
                    onCheckout(mockCartCourseForPayment);
                  } else {
                    setShowPayment(true);
                  }
                }}
              >
                Enroll Now
              </button>
            </div>
            
            <div className="flex items-start gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
              <ShieldCheck size={24} className="shrink-0 mt-1" />
              <span className="text-sm font-medium text-slate-500 leading-relaxed">
                Safe and Secure Payments. Easy returns. 100% Authentic products.
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Small helper component for the shield icon since it's used in the text
const ShieldCheck = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-shield-check text-slate-400 ${className}`}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

export default Cart;
