import React, { createContext, useState, useEffect, ReactNode } from "react";
import { User } from "firebase/auth";
import { auth } from "../firebase/client";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase/client";
import { InterviewSheet } from "../types";

// Extend the User object with a logicTreeList property
export interface AppUser extends User {
  interviewSheetList?: InterviewSheet[];
}

// Define the shape of the context
interface IUserContext {
  user: AppUser | null;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
}

// Create UserContext
export const UserContext = createContext<IUserContext | undefined>(undefined);

// Define the props for UserProvider
interface IUserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: IUserProviderProps) => {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // If the user is logged in, fetch additional user data from Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnapshot = onSnapshot(userRef, (doc) => {
          const data = doc.data();
          if (data) {
            setUser({
              ...user, // spread existing user properties
              logicTreeList: data.logicTreeList, // append Firestore data
            } as AppUser);
          }
        });

        // Return a cleanup function to unsubscribe when the component unmounts
        return () => {
          userSnapshot();
        };
      } else {
        // If the user is not logged in, set the user state to null
        setUser(null);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
