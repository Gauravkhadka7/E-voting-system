import React from "react";
import { Navigate } from "react-router-dom";
import UserSignup from "./UserSignup";

// VoterRegistration is an alias of UserSignup for the /voter/register route
export default function VoterRegistration() {
  return <UserSignup />;
}