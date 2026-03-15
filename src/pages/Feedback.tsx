import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Send, CheckCircle, MessageSquare, Smile, Frown, Meh, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'ui', label: 'UI / Design' },
  { id: 'ai', label: 'AI Features' },
  { id: 'performance', label: 'Performance' },
  { id: 'bug', label: 'Bug Report' },
];

export default function Feedback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState('general');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || rating === 0) {
      toast({ title: 'Missing fields', description: 'Please select a rating and write your feedback.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('user_feedback').insert({
        user_id: user?.id ?? null,
        name: name.trim() || null,
        email: email.trim() || null,
        rating,
        feedback_text: text.trim(),
        category,
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      toast({ title: 'Error', description: 'Could not submit feedback. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const displayRating = hoverRating || rating;
  const RatingIcon = displayRating <= 2 ? Frown : displayRating === 3 ? Meh : Smile;
  const ratingColor = displayRating <= 2 ? 'text-alert' : displayRating === 3 ? 'text-warning' : 'text-success';

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="border-b border-border bg-surface-1 px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 font-mono text-[10px] text-foreground-dim hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />Back
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4 max-w-md px-6"
          >
            <div className="w-16 h-16 rounded-full bg-success/10 border border-success/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="font-mono text-xl font-bold text-foreground">Thank you! 🎉</h2>
            <p className="font-mono text-sm text-foreground-dim leading-relaxed">
              Your feedback has been received. It helps us build a better CodeAtlas for everyone.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => { setSubmitted(false); setRating(0); setText(''); setName(''); }}
                className="font-mono text-[11px] px-4 py-2 rounded-xl border border-border bg-surface-2 text-foreground-dim hover:text-foreground transition-all"
              >
                Submit Another
              </button>
              <button
                onClick={() => navigate('/')}
                className="font-mono text-[11px] px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all"
              >
                Back to App
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-surface-1 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 font-mono text-[10px] text-foreground-dim hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />Back
        </button>
        <div className="h-4 w-px bg-border" />
        <span className="font-mono text-xs font-bold text-foreground">FEEDBACK</span>
        <a
          href="https://codeatlas2.lovable.app"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 font-mono text-[10px] text-foreground-dim hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Share App
        </a>
      </div>

      <div className="max-w-lg mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-mono text-2xl font-bold text-foreground mb-2">Share your experience</h1>
          <p className="font-mono text-sm text-foreground-dim leading-relaxed">
            Help us improve CodeAtlas. Your honest feedback shapes the product.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* Star Rating */}
          <div className="bg-surface-1 border border-border rounded-2xl p-5">
            <label className="font-mono text-[10px] text-foreground-dim uppercase tracking-wider block mb-4">
              Overall Rating
            </label>
            <div className="flex items-center gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= displayRating ? 'text-warning fill-warning' : 'text-foreground-dim'
                    }`}
                  />
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center justify-center gap-2 mt-3 font-mono text-[11px] ${ratingColor}`}
              >
                <RatingIcon className="w-4 h-4" />
                {displayRating === 1 ? 'Needs a lot of work' :
                  displayRating === 2 ? 'Could be better' :
                  displayRating === 3 ? 'It\'s okay' :
                  displayRating === 4 ? 'Pretty good!' : 'Absolutely love it! 🎉'}
              </motion.div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="font-mono text-[10px] text-foreground-dim uppercase tracking-wider block mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`font-mono text-[10px] px-3 py-1.5 rounded-lg border transition-all ${
                    category === cat.id
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-surface-2 border-border text-foreground-dim hover:text-foreground'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] text-foreground-dim uppercase tracking-wider block mb-1.5">Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-foreground-dim uppercase tracking-wider block mb-1.5">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Feedback text */}
          <div>
            <label className="font-mono text-[10px] text-foreground-dim uppercase tracking-wider block mb-1.5">Your Feedback *</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="What did you like? What could be better? Any bugs or feature requests?"
              rows={5}
              required
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 font-mono text-sm text-foreground placeholder:text-foreground-dim focus:outline-none focus:border-primary/50 transition-colors resize-none leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !text.trim() || rating === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-mono text-xs font-bold tracking-wider hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {loading ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </motion.form>
      </div>
    </div>
  );
}
