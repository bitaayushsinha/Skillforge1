import React from 'react';
import { Quote, Star } from 'lucide-react';

const LandingTestimonials = () => {
  const [testimonials, setTestimonials] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/api/feedback`)
      .then(res => res.json())
      .then(data => {
        setTestimonials(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch testimonials", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section className="py-24 bg-navy-900 text-white relative overflow-hidden flex justify-center items-center">
        <div className="text-xl font-medium">Loading testimonials...</div>
      </section>
    );
  }

  if (!testimonials || testimonials.length === 0) {
    return null;
  }

  return (
    <section className="py-24 bg-navy-900 text-white relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 p-12 opacity-10">
        <Quote className="w-64 h-64 text-white" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">What our students say</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.slice(0, 3).map((testimonial, index) => (
            <div key={testimonial.id || index} className="bg-navy-800 p-8 rounded-2xl border border-navy-700">
              <div className="flex text-coral mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < testimonial.rating ? 'fill-current' : 'text-slate-600'}`} />
                ))}
              </div>
              <p className="text-lg text-slate-200 mb-6 italic">
                "{testimonial.comment}"
              </p>
              <div className="flex items-center gap-4">
                <img src={`https://randomuser.me/api/portraits/${index % 2 === 0 ? 'men' : 'women'}/${index + 30}.jpg`} alt="User" className="w-12 h-12 rounded-full border-2 border-navy-700" />
                <div>
                  <h4 className="font-medium text-white">{testimonial.user_name}</h4>
                  <span className="text-sm text-slate-400">Learner</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingTestimonials;
