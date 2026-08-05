import { useState, useEffect } from 'react';

export function useWindowSize() {
  const [size, setSize] = useState({ width: 1024, height: 768 });
  useEffect(() => {
    const handle = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    handle();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return size;
}
