import { createContext, useContext } from "react";

export type AuthContextType = {
  lockApp: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  lockApp: async () => {},
});

export const useAuth = () => useContext(AuthContext);
