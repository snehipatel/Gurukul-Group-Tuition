import { createContext, useContext } from "react";

export type AuthContextType = {
  lockApp: () => Promise<void>;
  startChangePin: () => void;
  updatePin: (pin: string) => Promise<{ ok: boolean; message?: string }>;
};

export const AuthContext = createContext<AuthContextType>({
  lockApp: async () => {},
  startChangePin: () => {},
  updatePin: async () => ({ ok: false }),
});

export const useAuth = () => useContext(AuthContext);
