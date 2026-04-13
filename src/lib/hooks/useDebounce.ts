import { Dispatch, useEffect, useState } from "react";
import { flushSync } from "react-dom";

type UseDebounceType = <T>(args: {
  initialValue: T;
  delay?: number;
  onDebouncedChange?: (value: T) => void;
}) => {
  debouncedValue: T;
  setLiveValue: Dispatch<React.SetStateAction<T>>;
  liveValue: T;
};

const useDebounce: UseDebounceType = ({
  initialValue,
  delay,
  onDebouncedChange,
}) => {
  const [liveValue, setLiveValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(liveValue);

  useEffect(() => {
    const timeOut = setTimeout(() => {
      flushSync(() => setDebouncedValue(liveValue));
      onDebouncedChange && onDebouncedChange(liveValue);
    }, delay || 500);

    return () => {
      clearTimeout(timeOut);
    };
  }, [liveValue, delay]);

  return {
    debouncedValue,
    setLiveValue,
    liveValue,
  };
};

export default useDebounce;
