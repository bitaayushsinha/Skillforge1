import React from 'react';
import { Video, Clock, Award, Check } from 'lucide-react';

const LandingMethodology = () => {
  return (
    <>
      {/* BENEFITS / FEATURES */}
      <section id="benefits" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-coral font-medium tracking-wider uppercase text-sm">Why Choose Us</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-navy-900">
              A modern approach to tech mastery
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="group p-6 rounded-2xl bg-slate-50 hover:bg-navy-50 transition-colors duration-300 border border-slate-100">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-navy mb-6 group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-navy-900 mb-3 tracking-tight">AI & Expert Driven</h3>
              <p className="text-slate-600 leading-relaxed">
                Our courses combine AI-generated curricula with rigorous expert validation to ensure you learn the most cutting-edge tech.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 rounded-2xl bg-slate-50 hover:bg-navy-50 transition-colors duration-300 border border-slate-100">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-navy mb-6 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-navy-900 mb-3 tracking-tight">Self-Paced Learning</h3>
              <p className="text-slate-600 leading-relaxed">
                Learn on your own schedule. Access high-quality video modules, interactive quizzes, and coding environments 24/7.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 rounded-2xl bg-slate-50 hover:bg-navy-50 transition-colors duration-300 border border-slate-100">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-navy mb-6 group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-navy-900 mb-3 tracking-tight">Verified Certificates</h3>
              <p className="text-slate-600 leading-relaxed">
                Earn professional certificates upon course completion, verified by our platform and recognized by top employers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* UNIQUE BENEFITS */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?q=80&w=2940&auto=format&fit=crop" 
                  alt="Student learning on laptop" 
                  className="object-cover w-full h-full"
                />
              </div>
              {/* Floating Card */}
              <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-xl shadow-xl hidden md:block max-w-xs border border-slate-100">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Progress Tracking</p>
                    <p className="text-xs text-slate-500">Weekly reports included</p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>

            <div className="mt-12 lg:mt-0">
              <span className="text-coral font-medium tracking-wider uppercase text-sm">Our Methodology</span>
              <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-navy-900 mb-6">
                Structured learning for real-world results
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                We don't just teach theory; we teach practical application. Our platform immerses you in real-world scenarios from day one.
              </p>

              <div className="space-y-6">
                {/* List Item 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-navy-100 text-navy flex items-center justify-center font-semibold text-sm">01</div>
                  <div>
                    <h4 className="text-lg font-semibold text-navy-900">Curated Content</h4>
                    <p className="text-base text-slate-500 mt-1">Our AI creates comprehensive curricula which are then vetted by industry experts.</p>
                  </div>
                </div>
                {/* List Item 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-navy-100 text-navy flex items-center justify-center font-semibold text-sm">02</div>
                  <div>
                    <h4 className="text-lg font-semibold text-navy-900">Interactive Modules</h4>
                    <p className="text-base text-slate-500 mt-1">Access 24/7 video lessons, quizzes, and hands-on coding exercises.</p>
                  </div>
                </div>
                {/* List Item 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-navy-100 text-navy flex items-center justify-center font-semibold text-sm">03</div>
                  <div>
                    <h4 className="text-lg font-semibold text-navy-900">Community Support</h4>
                    <p className="text-base text-slate-500 mt-1">Join a community of learners and experts to ask questions and share knowledge.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default LandingMethodology;
