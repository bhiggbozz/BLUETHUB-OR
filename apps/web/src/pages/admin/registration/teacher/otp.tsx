import {
    Button,
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@bluethub/ui-kit";
import React, { useState, useEffect } from "react";
import { Shield, ArrowRight, RotateCcw } from "lucide-react";
import PasswordVerify from "@/component/password-verify";
import { Link } from "react-router-dom";

function TeacherOTP() {
    const [otpValue, setOtpValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [canResend, setCanResend] = useState(false);
    const [openVerify, setOpenVerify] = useState(false);
    const email = "stevebabajide@mail.com";

    // Countdown timer
    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [timeLeft]);

    // Format time display
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const isValid = otpValue.length === 6;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        setIsLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setIsLoading(false);
        setOpenVerify(true);
        //console.log("OTP:", otpValue);
    };

    const handleResend = async () => {
        setIsResending(true);
        // Simulate resend API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsResending(false);
        setTimeLeft(300);
        setCanResend(false);
        setOtpValue("");
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100  rounded-tl-xl rounded-tr-xl overflow-hidden">
            <div className="relative bg-linear-to-r from-chestnut via-chestnut/90 to-chestnut/80 px-8 py-4 mb-5">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 right-4 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-4 left-4 w-24 h-24 bg-white rounded-full blur-2xl"></div>
                </div>

                <div className="relative">
                    <div className="relative flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-xl text-white leading-tight">
                                Email Verification
                            </h2>
                            <p className="text-white/80 text-sm font-medium">
                                Confirm your identity
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-full max-w-lg mx-auto mt-12 mb-10">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                    <div className="px-8 py-7">
                        {/* Icon Section */}
                        <div className="text-center mb-10">
                            <h3 className="text-2xl font-bold text-chestnut mb-3 bg-linear-to-r from-chestnut to-chestnut/80 bg-clip-text ">
                                Please Check Your Email
                            </h3>
                            <p className="text-chestnut/70 font-medium leading-relaxed">
                                We've sent a 6-digit verification code to
                            </p>
                            <p className="text-chestnut font-semibold text-lg mt-1">
                                {email}
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* OTP Input */}
                            <div className="flex flex-col items-center space-y-4">
                                <div className="relative">
                                    <InputOTP
                                        maxLength={6}
                                        value={otpValue}
                                        onChange={setOtpValue}
                                        className="gap-3"
                                    >
                                        <InputOTPGroup className="gap-2">
                                            <InputOTPSlot
                                                index={0}
                                                className="w-14 h-14 text-xl font-bold border-2 border-chestnut/20 rounded-2xl focus:border-none focus:outline-none transition-all duration-200 bg-white/80"
                                            />
                                            <InputOTPSlot
                                                index={1}
                                                className="w-14 h-14 text-xl font-bold border-2 border-chestnut/20 rounded-2xl focus:border-chestnut focus:ring-4 focus:ring-chestnut/10 transition-all duration-200 bg-white/80"
                                            />
                                            <InputOTPSlot
                                                index={2}
                                                className="w-14 h-14 text-xl font-bold border-2 border-chestnut/20 rounded-2xl focus:border-chestnut focus:ring-4 focus:ring-chestnut/10 transition-all duration-200 bg-white/80"
                                            />
                                        </InputOTPGroup>
                                        <InputOTPSeparator className="text-chestnut/40" />
                                        <InputOTPGroup className="gap-2">
                                            <InputOTPSlot
                                                index={3}
                                                className="w-14 h-14 text-xl font-bold border-2 border-chestnut/20 rounded-2xl focus:border-chestnut focus:ring-4 focus:ring-chestnut/10 transition-all duration-200 bg-white/80"
                                            />
                                            <InputOTPSlot
                                                index={4}
                                                className="w-14 h-14 text-xl font-bold border-2 border-chestnut/20 rounded-2xl focus:border-chestnut focus:ring-4 focus:ring-chestnut/10 transition-all duration-200 bg-white/80"
                                            />
                                            <InputOTPSlot
                                                index={5}
                                                className="w-14 h-14 text-xl font-bold border-2 border-chestnut/20 rounded-2xl focus:border-chestnut focus:ring-4 focus:ring-chestnut/10 transition-all duration-200 bg-white/80"
                                            />
                                        </InputOTPGroup>
                                    </InputOTP>
                                </div>

                                {/* Timer and Resend */}
                                <div className="text-center space-y-2">
                                    {!canResend ? (
                                        <p className="text-chestnut/60 text-sm font-medium">
                                            Code expires in{" "}
                                            <span className="font-bold text-chestnut">
                                                {formatTime(timeLeft)}
                                            </span>
                                        </p>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={handleResend}
                                            disabled={isResending}
                                            className="text-chestnut hover:text-chestnut/80 hover:bg-chestnut/5 font-semibold text-sm p-0 h-auto"
                                        >
                                            {isResending ? (
                                                <div className="flex items-center gap-2">
                                                    <RotateCcw className="w-4 h-4 animate-spin" />
                                                    Resending...
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <RotateCcw className="w-4 h-4" />
                                                    Resend Code
                                                </div>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={!isValid || isLoading}
                                className={`w-full py-7 text-base font-bold rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${isValid && !isLoading
                                    ? "bg-linear-to-r from-chestnut to-chestnut/90 hover:from-chestnut/90 hover:to-chestnut shadow-lg hover:shadow-xl"
                                    : "bg-chestnut/50 cursor-not-allowed"
                                    } text-white`}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Verifying Code...
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        Verify & Continue
                                        <ArrowRight className="w-5 h-5" />
                                    </div>
                                )}
                            </Button>
                            <p className="text-center font-poppins font-normal text-base  text-chestnut/50">Didn’t receive an email. <Link to="/admin/registration/teacher/email-verification" className="font-medium text-chestnut">Resend</Link></p>
                        </form>

                        {/* Security Notice */}
                        <div className="mt-8 p-4 bg-chestnut/5 rounded-xl border border-chestnut/10">
                            <div className="flex items-start gap-3">
                                <Shield className="w-5 h-5 text-chestnut/60 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-chestnut/70 text-sm font-medium">
                                        <span className="font-semibold">Security Tip:</span> Never
                                        share this code with anyone. It expires in 5 minutes for
                                        your protection.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <PasswordVerify openVerify={openVerify} onOpenChange={setOpenVerify} />
        </div>
    );
}

export default TeacherOTP;
