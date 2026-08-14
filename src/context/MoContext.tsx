import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getLocalTodayYYYYMMDD } from "../utils/mo/date";

type MoContextValue = {
  moSearchDate: string;
  setMoSearchDate: (date: string) => void;
  resetMoSearchDate: () => void;
  listSearchDate: string;
  setListSearchDate: (date: string) => void;
  resetListSearchDate: () => void;
};

const MoContext = createContext<MoContextValue | null>(null);

type MoProviderProps = {
  children: ReactNode;
};

export function MoProvider({ children }: MoProviderProps) {
  const [moSearchDate, setMoSearchDate] = useState(getLocalTodayYYYYMMDD);
  const [listSearchDate, setListSearchDate] = useState(getLocalTodayYYYYMMDD);

  const resetMoSearchDate = useCallback(() => {
    setMoSearchDate(getLocalTodayYYYYMMDD());
  }, []);

  const resetListSearchDate = useCallback(() => {
    setListSearchDate(getLocalTodayYYYYMMDD());
  }, []);

  const value = useMemo(
    () => ({
      moSearchDate,
      setMoSearchDate,
      resetMoSearchDate,
      listSearchDate,
      setListSearchDate,
      resetListSearchDate,
    }),
    [listSearchDate, moSearchDate, resetListSearchDate, resetMoSearchDate],
  );

  return <MoContext.Provider value={value}>{children}</MoContext.Provider>;
}

export function useMoContext() {
  const context = useContext(MoContext);

  if (!context) {
    throw new Error("useMoContext must be used within MoProvider");
  }

  return context;
}
