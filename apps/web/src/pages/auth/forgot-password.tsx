import { AxiosError } from "axios";
import {  CheckCircle2, ChevronLeft, Loader2, User, XCircle } from "lucide-react";
import {  useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link } from "react-router-dom";

import { authService } from "@/services/auth";
// import { localData } from "@/utils";
import { forgotPasswordSchema } from "@/utils/validate";

interface ForgotPasswordInput {
  userName: string;
}

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  // const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);
  // const [schoolName, setSchoolName] = useState<string | null>(null);
  // responseCode 99000 is always shown regardless of whether the username was
  // real (prevents enumeration) — AX1003 and 99001 are genuine, actionable
  // outcomes for the entered username, so they get an error treatment.
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  // useEffect(() => {
  //   const stored =
  //     localData.retrieve<{ logoUrl: string; schoolName: string }>("th_school") ??
  //     localData.retrieve<{ logoUrl: string; schoolName: string }>("schoolInfo");
  //   if (stored?.logoUrl) setSchoolLogoUrl(stored.logoUrl);
  //   if (stored?.schoolName) setSchoolName(stored.schoolName);
  // }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: yupResolver(forgotPasswordSchema) });

  const handleForgotPassword = async (data: ForgotPasswordInput) => {
    setResult(null);
    try {
      setLoading(true);
      const response = await authService.forgotPassword(data.userName);
      const body = response.data;
      setResult({ ok: body.responseCode === "99000", message: body.responseMessage });
    } catch (error) {
      const msg =
        error instanceof AxiosError
          ? error.response?.data?.responseMessage ??
          error.response?.data?.message ??
          error.message
          : (error as Error).message;
      setResult({ ok: false, message: msg || "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-poppins flex flex-col gap-10 justify-center h-full rounded-[18px] py-13 px-7.5 shadow-[0_4px_16px_0px_rgba(41,35,130,0.08),0_24px_64px_0px_rgba(41,35,130,0.13)] lg:px-0 md:shadow-none md:max-w-md mx-auto lg:py-10">
      <Link
        to="/auth"
        className="flex  md:hidden items-center gap-1.5 text-xs font-Poppins font-semibold  text-chestnut transition-colors mb-4"
      >
        <ChevronLeft className="size-7 text-black font-medium" />
        Back to sign in
      </Link>
      <div>
        {/* ── Heading ── */}
        <div className="mb-8">
          <span className="text-xs font-Poppins font-bold text-chestnut uppercase tracking-widest">
            Reset Password
          </span>
          <h1 className="text-2xl font-Poppins font-bold text-[#0F0F0E] mt-1">
            Forgot your password?
          </h1>
          {/* <p className="text-gray-400 font-Poppins text-sm mt-1.5">
            Enter your username and we'll email a reset link to the address on file.
          </p> */}
        </div>

        {/* ── School branding ── */}
        {/* {schoolLogoUrl && (
          <div className="mb-6">
            <img
              src={schoolLogoUrl}
              alt={schoolName ?? "School logo"}
              loading="lazy"
              className="h-8 w-auto object-contain"
            />
          </div>
        )} */}

        {/* ── Result banner ── */}
        {result && (
          <div
            role="alert"
            className={`flex items-start gap-2 border rounded-lg px-4 py-3 text-sm mb-5 ${result.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-600"
              }`}
          >
            {result.ok ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            )}
            <span>{result.message}</span>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit(handleForgotPassword)} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="userName" className="block font-Poppins text-sm font-semibold text-[#0F0F0E]">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="userName"
                {...register("userName")}
                type="text"
                placeholder="Enter your username"
                autoComplete="username"
                className="w-full border font-Poppins border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-chestnut/30 focus:border-chestnut/40 transition-all"
              />
            </div>
            {errors.userName && (
              <p className="text-red-500 font-Poppins text-xs pl-1">{errors.userName.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-Poppins rounded-lg bg-chestnut text-white text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>Sending link...</span>
              </>
            ) : (
              <span>Send Reset Link</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
