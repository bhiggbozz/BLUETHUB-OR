import { AxiosError } from "axios";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react"
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { newPasswordSchema, TEACHER_ROLE_IDS, UserRole, newPasswordComplexSchema } from "@/utils/validate";
import { authService } from "@/services/auth";
// import { getDeviceIp, getDeviceType } from "@/utils";
import { useNavigate } from "react-router-dom";
import { Hashing, localData, token } from "@/utils";
import type { schoolInfo } from "@/services";
import { useAuthContext } from "@/contexts/auth-context";
import { getParsedToken } from "@/utils/decode";
import { PasswordRules, RULES } from "./password-rules";

const NewPassword = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [isStudent, setIsStudent] = useState<number>();
    const { login: loginAuth } = useAuthContext();

    // Restore school branding from a previous session
    useEffect(() => {
        const stored =
            localData.retrieve<{ roleId: number }>("schoolInfo");
        if (stored?.roleId && stored?.roleId === 0) setIsStudent(stored.roleId);
    }, []);


    // Staff roles (everyone but Student) must satisfy the stricter complexity
    // Yw%M56a&
    // schema. roleId is stashed in localStorage by the login screen's
    // firstTimeLogin branch (Student = 0).

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<{ hashPassword: string; password: string; confirmPassword: string }>({
        resolver: yupResolver(isStudent ? newPasswordSchema : newPasswordComplexSchema),
    });

    const watchedPassword = watch("password", "");
    const watchedOldPassword = watch("hashPassword", "");

    // all rules passed — used to gate the submit button for staff
    const allRulesPassed = !isStudent && RULES.every(r => r.test(watchedPassword))
        && watchedPassword.length > 0
        && watchedPassword !== watchedOldPassword;

    const schoolId = localData.retrieve("schoolInfo") as schoolInfo

    const handleUpdatePassword = async (data: { hashPassword: string, password: string, confirmPassword: string }) => {
        const username = localStorage.getItem("username")
        if (!schoolId?.id) {
            console.error("School info is missing. Cannot proceed.");
            return;
        }
        if (!username) {
            setErrorMsg("Username is missing. Cannot proceed.");
            return;
        }
        const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? "Mobile" : "Desktop";
        const currentPassword = await Hashing(data.hashPassword)
        const payload = {
            hashPassword: await Hashing(data.password),
            currentHashPassword: currentPassword,
            deviceType,
            deviceIp: "",
            schoolId: schoolId.id,
            username,
        }
        setErrorMsg("")
        try {
            setLoading(true);
            const response = await authService.updatePasswordNewUser(payload);
            const result = response.data;

            const user = getParsedToken(result.token);
            if (!user) {
                setErrorMsg("Invalid session token. Please try again.");
                return;
            }

            token.login(result.token, result.refreshToken);
            localData.save("user", {
                id: result.id,
                firstName: result.firstName,
                lastName: result.lastName,
                email: result.emailAddress,
                roleId: result.roleId,
                firstTimeLogin: result.firstTimeLogin,
            });
            localData.save("school", result.schoolInfo);
            // Legacy keys — keep for auth context + existing code
            localData.save("schoolInfo", result.schoolInfo);

            // Hydrate auth context (sets "token" key in localStorage + user state)
            localStorage.setItem("accessTokenExpiresAt", String(Date.now() + result.tokenExpiresIn * 1000));
            loginAuth(result.token, { ...user, roleName: user.role }, result.refreshToken);

            // ── Role-based redirect via roleId ───────────────────────────────────
            if (result.roleId === UserRole.SuperAdministrator || result.roleId === UserRole.Administrator) {
                navigate("/admin");
            } else if (TEACHER_ROLE_IDS.includes(result.roleId)) {
                navigate("/teacher");
            } else if (result.roleId === UserRole.Parent) {
                navigate("/parent");
            } else {
                navigate("/student");
            }


        } catch (error) {
            const msg =
                error instanceof AxiosError
                    ? error.response?.data?.responseMessage ??
                    error.response?.data?.message ??
                    error.message
                    : (error as Error).message;
            setErrorMsg(msg);
            setTimeout(() => navigate("/auth"), 2500);
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="font-poppins flex flex-col  h-full overflow-y-scroll  py-13 px-7.5 shadow-[0_4px_16px_0px_rgba(41,35,130,0.08),0_24px_64px_0px_rgba(41,35,130,0.13)]  lg:px-7  md:shadow-none md:max-w-xl mx-auto lg:py-10">

            <div className="mb-10 md:hidden">
                <svg width="191" height="42" viewBox="0 0 191 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.5343 16.6353V28.314H20.3248V16.6353H22.5343ZM32.9712 19.5707V28.314H30.746V27.2092C30.4619 27.588 30.0884 27.8879 29.6254 28.1088C29.173 28.3192 28.6785 28.4244 28.1419 28.4244C27.458 28.4244 26.8531 28.2824 26.327 27.9983C25.8009 27.7037 25.3853 27.2776 25.0802 26.72C24.7856 26.1518 24.6383 25.4785 24.6383 24.6999V19.5707H26.8478V24.3843C26.8478 25.0787 27.0214 25.6152 27.3686 25.994C27.7158 26.3623 28.1893 26.5464 28.789 26.5464C29.3992 26.5464 29.878 26.3623 30.2252 25.994C30.5724 25.6152 30.746 25.0787 30.746 24.3843V19.5707H32.9712ZM43.2789 23.753C43.2789 24.0686 43.2579 24.3527 43.2158 24.6052H36.8241C36.8767 25.2365 37.0977 25.731 37.487 26.0887C37.8763 26.4464 38.355 26.6253 38.9231 26.6253C39.7438 26.6253 40.3277 26.2728 40.6749 25.5679H43.058C42.8055 26.4096 42.3215 27.104 41.6061 27.6511C40.8906 28.1877 40.0121 28.456 38.9705 28.456C38.1288 28.456 37.3712 28.2719 36.6979 27.9036C36.035 27.5249 35.5142 26.9935 35.1354 26.3097C34.7672 25.6258 34.5831 24.8367 34.5831 23.9424C34.5831 23.0375 34.7672 22.2432 35.1354 21.5593C35.5037 20.8754 36.0192 20.3493 36.6821 19.9811C37.3449 19.6128 38.1077 19.4287 38.9705 19.4287C39.8017 19.4287 40.5434 19.6076 41.1957 19.9653C41.8586 20.323 42.3689 20.8333 42.7266 21.4961C43.0948 22.1485 43.2789 22.9007 43.2789 23.753ZM40.9906 23.1217C40.98 22.5535 40.7749 22.1011 40.3751 21.7644C39.9753 21.4172 39.486 21.2436 38.9073 21.2436C38.3602 21.2436 37.8973 21.412 37.5185 21.7487C37.1503 22.0748 36.9241 22.5325 36.8399 23.1217H40.9906ZM47.4641 21.3857V25.6152C47.4641 25.9098 47.5325 26.1255 47.6693 26.2623C47.8166 26.3886 48.0586 26.4517 48.3953 26.4517H49.4211V28.314H48.0323C46.17 28.314 45.2389 27.4091 45.2389 25.5995V21.3857H44.1973V19.5707H45.2389V17.4086H47.4641V19.5707H49.4211V21.3857H47.4641ZM55.9342 19.4445C56.5971 19.4445 57.1863 19.5918 57.7018 19.8864C58.2174 20.1705 58.6172 20.5966 58.9013 21.1647C59.1959 21.7224 59.3432 22.3957 59.3432 23.1848V28.314H57.1337V23.4847C57.1337 22.7903 56.9601 22.2589 56.6129 21.8907C56.2657 21.5119 55.7922 21.3225 55.1925 21.3225C54.5823 21.3225 54.0983 21.5119 53.7406 21.8907C53.3934 22.2589 53.2197 22.7903 53.2197 23.4847V28.314H51.0103V16.6353H53.2197V20.6597C53.5038 20.2809 53.8826 19.9863 54.3561 19.7759C54.8295 19.555 55.3556 19.4445 55.9342 19.4445ZM69.6982 19.5707V28.314H67.473V27.2092C67.1889 27.588 66.8154 27.8879 66.3525 28.1088C65.9 28.3192 65.4055 28.4244 64.8689 28.4244C64.1851 28.4244 63.5801 28.2824 63.054 27.9983C62.528 27.7037 62.1124 27.2776 61.8072 26.72C61.5126 26.1518 61.3653 25.4785 61.3653 24.6999V19.5707H63.5748V24.3843C63.5748 25.0787 63.7484 25.6152 64.0956 25.994C64.4428 26.3623 64.9163 26.5464 65.516 26.5464C66.1262 26.5464 66.605 26.3623 66.9522 25.994C67.2994 25.6152 67.473 25.0787 67.473 24.3843V19.5707H69.6982ZM74.0877 20.8491C74.3718 20.4282 74.7611 20.0863 75.2556 19.8233C75.7606 19.5602 76.334 19.4287 76.9758 19.4287C77.7228 19.4287 78.3962 19.6128 78.9959 19.9811C79.6062 20.3493 80.0849 20.8754 80.4321 21.5593C80.7898 22.2326 80.9687 23.0165 80.9687 23.9108C80.9687 24.8051 80.7898 25.5995 80.4321 26.2939C80.0849 26.9778 79.6062 27.5091 78.9959 27.8879C78.3962 28.2666 77.7228 28.456 76.9758 28.456C76.3235 28.456 75.7501 28.3297 75.2556 28.0772C74.7716 27.8142 74.3823 27.4775 74.0877 27.0672V28.314H71.8782V16.6353H74.0877V20.8491ZM78.7118 23.9108C78.7118 23.3847 78.6014 22.9323 78.3804 22.5535C78.17 22.1643 77.8859 21.8697 77.5282 21.6698C77.181 21.4698 76.8022 21.3699 76.3919 21.3699C75.9921 21.3699 75.6133 21.4751 75.2556 21.6855C74.9084 21.8854 74.6243 22.18 74.4034 22.5693C74.1929 22.9586 74.0877 23.4163 74.0877 23.9424C74.0877 24.4684 74.1929 24.9261 74.4034 25.3154C74.6243 25.7047 74.9084 26.0045 75.2556 26.215C75.6133 26.4149 75.9921 26.5148 76.3919 26.5148C76.8022 26.5148 77.181 26.4096 77.5282 26.1992C77.8859 25.9888 78.17 25.6889 78.3804 25.2996C78.6014 24.9103 78.7118 24.4474 78.7118 23.9108Z" fill="url(#paint0_linear_3758_4452)" />
                    <path d="M9.03445 30.3515C8.02672 30.3515 7.0307 30.2344 6.0464 30C5.08554 29.7656 4.23014 29.4141 3.4802 28.9454C3.2224 28.7579 3.04664 28.4884 2.95289 28.1369C2.85915 27.7619 2.81228 27.3166 2.81228 26.801C2.81228 25.887 2.98805 24.809 3.33958 23.5669C3.69112 22.3014 4.13639 21.0007 4.67541 19.6649C5.21444 18.329 5.77689 17.0635 6.36278 15.8683C6.94867 14.6731 7.47598 13.6888 7.94469 12.9154C8.38997 12.2358 8.94071 11.7671 9.5969 11.5093C10.2531 11.228 10.9445 11.0874 11.671 11.0874C13.2412 11.0874 13.9091 11.228 13.6747 11.5093C13.1826 12.0717 12.667 12.8099 12.128 13.7239C11.5889 14.6379 11.0851 15.5753 10.6164 16.5362C10.1476 17.4736 9.74924 18.2939 9.42114 18.997C8.64776 20.6375 7.96813 22.2428 7.38223 23.813C6.79634 25.3597 6.39794 26.6135 6.18702 27.5744C6.14014 27.7619 6.11671 27.9142 6.11671 28.0314C6.11671 28.2892 6.19873 28.5236 6.36278 28.7345C6.52683 28.922 6.81978 29.0509 7.24162 29.1212C7.40567 29.1446 7.558 29.168 7.69862 29.1915C7.86267 29.1915 8.02672 29.1915 8.19076 29.1915C9.08132 29.1915 9.90157 28.9688 10.6515 28.5236C11.4015 28.0783 11.8702 27.4338 12.0576 26.5901C12.128 26.3089 12.1514 26.0042 12.128 25.6761C12.128 25.1137 12.0459 24.4926 11.8819 23.813C11.7178 23.1334 11.4718 22.5006 11.1437 21.9147C10.839 21.3288 10.4406 20.8952 9.94844 20.614C9.71408 20.4734 9.5969 20.3094 9.5969 20.1219C9.5969 19.9109 9.7258 19.782 9.98359 19.7352C10.546 19.7352 11.1202 19.5125 11.7061 19.0673C12.3154 18.622 12.8662 18.0361 13.3583 17.3096C13.8739 16.5831 14.284 15.798 14.5887 14.9543C14.9168 14.0872 15.0809 13.2552 15.0809 12.4584C15.0809 11.3335 14.741 10.5601 14.0614 10.1383C13.4052 9.693 12.6201 9.47036 11.7061 9.47036C10.9327 9.47036 10.1359 9.58754 9.31568 9.82189C8.49543 10.0328 7.78064 10.2789 7.17131 10.5601C5.85892 11.1694 4.75744 11.9545 3.86688 12.9154C2.99977 13.8763 2.4959 14.8137 2.35528 15.7277C2.23811 15.6808 2.01547 15.6222 1.68737 15.5519C1.35927 15.4816 1.03117 15.341 0.70307 15.1301C0.398406 14.9191 0.222639 14.6145 0.175767 14.2161C0.10546 13.3958 0.304664 12.6693 0.773377 12.0366C1.26553 11.3804 1.93344 10.8296 2.77713 10.3843C3.64425 9.91564 4.59339 9.52895 5.62456 9.22428C6.67916 8.91962 7.74549 8.69698 8.82353 8.55637C9.90157 8.41575 10.9093 8.34544 11.8467 8.34544C12.2451 8.34544 12.6201 8.35716 12.9716 8.3806C13.3232 8.40404 13.6396 8.43919 13.9208 8.48606C15.7956 8.79072 17.1432 9.40005 17.9634 10.314C18.7837 11.2046 19.1938 12.2006 19.1938 13.3021C19.1938 14.2864 18.9009 15.259 18.315 16.2198C17.7291 17.1573 16.9206 17.9541 15.8894 18.6103C14.8816 19.243 13.7216 19.5946 12.4092 19.6649C13.7685 19.9695 14.8113 20.6257 15.5378 21.6335C16.2878 22.6178 16.6628 23.6841 16.6628 24.8324C16.6628 25.7933 16.3815 26.719 15.8191 27.6096C15.2566 28.5001 14.3543 29.1798 13.1123 29.6485C11.8936 30.1172 10.5343 30.3515 9.03445 30.3515Z" fill="url(#paint1_linear_3758_4452)" />
                    <path d="M23.5728 11.8657L26.3477 13.5403L30.5078 11.0284L26.3477 8.5166L22.1875 11.0284H26.3477V11.8657H23.5728ZM22.1875 11.8657V15.2149L23.0195 14.2855V12.3681L22.1875 11.8657ZM26.3477 16.8894L24.2676 15.6335L23.4356 15.1311V12.6193L26.3477 14.3776L29.2598 12.6193V15.1311L26.3477 16.8894Z" fill="#6C30D4" />
                    <defs>
                        <linearGradient id="paint0_linear_3758_4452" x1="20.332" y1="33.6379" x2="79.7327" y2="34.2491" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#4F61E8" />
                            <stop offset="1" stop-color="#E924A1" />
                        </linearGradient>
                        <linearGradient id="paint1_linear_3758_4452" x1="0.2958" y1="40.8169" x2="16.3262" y2="40.8423" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#4F61E8" />
                            <stop offset="1" stop-color="#E924A1" />
                        </linearGradient>
                    </defs>
                </svg>

            </div>

            {/* ── Heading ── */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[#0F0F0E] mt-1">
                    Update Password
                </h1>
                <p className="text-gray-400 text-sm mt-1.5">
                    Enter new Password to continue
                </p>
            </div>



            {/* ── Inline error banner ── */}
            {errorMsg && (
                <div
                    role="alert"
                    className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-5"
                >
                    <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* ── Form ── */}
            <form onSubmit={handleSubmit(handleUpdatePassword)} className="space-y-5" noValidate>

                {/* hashPassword */}
                <div className="space-y-1.5">
                    <label htmlFor="Oldpassword" className="block text-sm font-semibold text-[#0F0F0E]">
                        Old password
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            id="Oldpassword"
                            {...register("hashPassword")}
                            type="password"
                            placeholder="Enter your old password"
                            autoComplete="current-password"
                            className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-chestnut/30 focus:border-chestnut/40 transition-all"
                        />
                    </div>
                    {errors.hashPassword && (
                        <p className="text-red-500 text-xs pl-1">{errors.hashPassword.message}</p>
                    )}
                </div>

                {/* Password */}
                {/* Password field */}
                <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-sm font-semibold text-[#0F0F0E]">
                        Password
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            id="password"
                            {...register("password")}
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            className="w-full border border-gray-200 rounded-lg pl-9 pr-11 py-2.5 text-sm outline-none focus:ring-2 focus:ring-chestnut/30 focus:border-chestnut/40 transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="text-red-500 text-xs pl-1">{errors.password.message}</p>
                    )}

                    {/* ← show checker only for non-students */}
                    {!isStudent && watchedPassword.length > 0 && (
                        <PasswordRules password={watchedPassword} oldPassword={watchedOldPassword} />
                    )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[#0F0F0E]">
                            Confirm Password
                        </label>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            id="confirmPassword"
                            {...register("confirmPassword")}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="w-full border border-gray-200 rounded-lg pl-9 pr-11 py-2.5 text-sm outline-none focus:ring-2 focus:ring-chestnut/30 focus:border-chestnut/40 transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(v => !v)}
                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                    {errors.confirmPassword && (
                        <p className="text-red-500 text-xs pl-1">{errors.confirmPassword.message}</p>
                    )}
                </div>
                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading || (!isStudent && !allRulesPassed)}
                    className="w-full py-3 rounded-lg bg-chestnut text-white text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity mt-2"
                >
                    {loading ? (
                        <><Loader2 className="size-4 animate-spin" /><span>Updating password...</span></>
                    ) : (
                        <span>Update Password</span>
                    )}
                </button>
            </form>
        </div>
    );
}

export default NewPassword