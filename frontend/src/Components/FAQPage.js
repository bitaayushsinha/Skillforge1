import React from 'react';

const FAQPage = () => {
  const faqs = [
    {
      question: "What is SkillForge?",
      answer: "SkillForge is an AI-powered learning platform that creates custom courses based on user demand and expert validation."
    },
    {
      question: "How do I request a course?",
      answer: "You can request a course using the 'Propose Course' button. Our AI will analyze the request and create a curriculum."
    },
    {
      question: "Are the courses free?",
      answer: "Yes, we offer many free courses as well as premium options."
    },
    {
      question: "Who validates the courses?",
      answer: "Our network of domain experts reviews and validates AI-generated courses to ensure accuracy and quality."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-navy-900 mb-8 text-center">Frequently Asked Questions</h1>
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-xl font-semibold text-navy-900 mb-3">{faq.question}</h3>
              <p className="text-slate-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
