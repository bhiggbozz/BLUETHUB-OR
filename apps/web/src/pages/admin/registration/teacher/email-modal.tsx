import { useState } from "react";
import { Label, Input, Button } from "@bluethub/ui-kit";
import { Mail, ArrowRight, Check, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const EmailModal = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isValid, setIsValid] = useState(false);

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEmail(value);
        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        setIsValid(emailRegex.test(value));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        setIsLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsLoading(false);
        //console.log("Email:", email);
        // Navigate to OTP page
        navigate("/admin/registration/teacher/verification/otp");
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100  rounded-tl-xl rounded-tr-xl overflow-hidden">
            <div className="relative bg-linear-to-r from-chestnut via-chestnut/90 to-chestnut/80 px-8 py-4 mb-5">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 right-4 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-4 left-4 w-24 h-24 bg-white rounded-full blur-2xl"></div>
                </div>

                <div className="relative">
                    <div>
                        <h2 className="font-bold text-xl text-white leading-tight">
                            Email Verification
                        </h2>
                    </div>
                </div>
            </div>
            <div className="w-full max-w-lg mx-auto mt-12">
                {/* Main Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                    {/* Header */}

                    {/* Content */}
                    <div className="px-8 py-12">
                        {/* Icon Section */}
                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-bold text-chestnut mb-2 bg-linear-to-r from-chestnut to-chestnut/80 bg-clip-text">
                                Please Enter Your Email
                            </h3>
                            <p className="text-chestnut/60 font-medium">
                                We'll send a verification link to confirm your identity
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-3">
                                <Label
                                    htmlFor="email"
                                    className="text-chestnut font-semibold text-base flex items-center gap-2"
                                >
                                    <Mail className="w-4 h-4" />
                                    Email Address
                                </Label>

                                <div className="relative">
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={handleEmailChange}
                                        placeholder="teacher@school.edu"
                                        required
                                        className={`w-full px-4 py-4 text-base border-2 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 placeholder:text-chestnut/40 ${email
                                                ? isValid
                                                    ? "border-green-300 focus:border-green-400 ring-green-100"
                                                    : "border-red-300 focus:border-red-400 ring-red-100"
                                                : "border-chestnut/20 focus:border-chestnut/40 ring-chestnut/10"
                                            } focus:ring-4`}
                                    />

                                    {/* Validation Icon */}
                                    {email && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            {isValid ? (
                                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            ) : (
                                                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-xs font-bold">
                                                        !
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Validation Message */}
                                {email && !isValid && (
                                    <p className="text-red-500 text-sm font-medium flex items-center gap-1">
                                        <span className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs">!</span>
                                        </span>
                                        Please enter a valid email address
                                    </p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={!isValid || isLoading}
                                className={`w-full py-4 text-base font-bold rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${isValid && !isLoading
                                        ? "bg-linear-to-r from-chestnut to-chestnut/90 hover:from-chestnut/90 hover:to-chestnut shadow-lg hover:shadow-xl"
                                        : "bg-chestnut/50 cursor-not-allowed"
                                    } text-white`}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <Link to="/admin/registration/teacher/verification/otp">
                                            Verifying...
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        <Link to="/admin/registration/teacher/verification-resend">
                                            Continue
                                        </Link>
                                        <ArrowRight className="w-5 h-5" />
                                    </div>
                                )}
                            </Button>
                        </form>

                        {/* Security Notice */}
                        <div className="mt-8 p-4 bg-chestnut/5 rounded-xl border border-chestnut/10">
                            <div className="flex items-start gap-3">
                                <Shield className="w-5 h-5 text-chestnut/60 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-chestnut/70 text-sm font-medium">
                                        <span className="font-semibold">Security Notice:</span>{" "}
                                        We'll send a verification email to confirm your identity.
                                        This helps keep your account secure.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailModal;
