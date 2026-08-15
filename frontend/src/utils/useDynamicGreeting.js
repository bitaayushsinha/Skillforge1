import { useState, useEffect } from 'react';

export const getGreetingData = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { text: 'Good Morning', emoji: '☀️', period: 'morning' };
  } else if (hour >= 12 && hour < 17) {
    return { text: 'Good Afternoon', emoji: '🌤️', period: 'afternoon' };
  } else if (hour >= 17 && hour < 21) {
    return { text: 'Good Evening', emoji: '🌆', period: 'evening' };
  } else {
    return { text: 'Good Night', emoji: '🌙', period: 'night' };
  }
};

export const useDynamicGreeting = () => {
  const [greeting, setGreeting] = useState(getGreetingData);

  useEffect(() => {
    const updateGreeting = () => {
      setGreeting(getGreetingData());
    };

    // Check and update local time greeting every 60 seconds
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  return greeting;
};

export default useDynamicGreeting;
