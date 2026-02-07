import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-content-bg p-4">
      <SignIn />
    </div>
  );
}
