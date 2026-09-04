import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { AxiosError } from "axios";
import { Eye, EyeOff, Loader2, User, Lock, } from "lucide-react";

import { authService } from "@/services/auth";
import { Hashing, localData } from "@/utils";
import { getParsedToken } from "@/utils/decode";
import { useAuthContext } from "@/contexts/auth-context";
import { loginSchema, TEACHER_ROLE_IDS, UserRole } from "@/utils/validate";
import { API } from "@/services";
import { getTenantFromUrl } from "@/utils/subdomain";


export interface UserLoginInput {
  userName: string;
  password: string;
}

// ── Bluethub logo SVG (shown when no school logo is available) ──────────────
// const BluethubLogo = () => (
//   <svg
//     width="82"
//     height="42"
//     viewBox="0 0 82 42"
//     fill="none"
//     xmlns="http://www.w3.org/2000/svg"
//     aria-label="Bluethub"
//   >
//     <path
//       d="M22.3553 15.6459V27.2319H20.1633V15.6459H22.3553ZM32.7094 18.558V27.2319H30.5018V26.1359C30.22 26.5117 29.8494 26.8091 29.3901 27.0283C28.9413 27.2371 28.4507 27.3415 27.9184 27.3415C27.24 27.3415 26.6398 27.2006 26.1179 26.9187C25.596 26.6265 25.1837 26.2037 24.881 25.6505C24.5888 25.0869 24.4426 24.4189 24.4426 23.6465V18.558H26.6346V23.3333C26.6346 24.0222 26.8068 24.5546 27.1512 24.9303C27.4957 25.2957 27.9654 25.4783 28.5603 25.4783C29.1657 25.4783 29.6407 25.2957 29.9851 24.9303C30.3295 24.5546 30.5018 24.0222 30.5018 23.3333V18.558H32.7094ZM42.9353 22.7071C42.9353 23.0202 42.9144 23.302 42.8727 23.5525H36.5317C36.5839 24.1788 36.8031 24.6694 37.1893 25.0243C37.5755 25.3792 38.0504 25.5566 38.614 25.5566C39.4282 25.5566 40.0075 25.2069 40.3519 24.5076H42.7161C42.4656 25.3426 41.9854 26.0315 41.2757 26.5743C40.5659 27.1066 39.6943 27.3728 38.661 27.3728C37.826 27.3728 37.0745 27.1901 36.4064 26.8248C35.7489 26.449 35.2322 25.9219 34.8564 25.2435C34.4911 24.565 34.3084 23.7822 34.3084 22.895C34.3084 21.9973 34.4911 21.2093 34.8564 20.5308C35.2217 19.8523 35.7332 19.3304 36.3908 18.9651C37.0484 18.5998 37.8051 18.4171 38.661 18.4171C39.4856 18.4171 40.2215 18.5946 40.8686 18.9495C41.5262 19.3044 42.0324 19.8106 42.3873 20.4682C42.7526 21.1153 42.9353 21.8616 42.9353 22.7071ZM40.6651 22.0808C40.6546 21.5172 40.4511 21.0683 40.0545 20.7343C39.6578 20.3899 39.1725 20.2177 38.5984 20.2177C38.0556 20.2177 37.5963 20.3847 37.2206 20.7187C36.8553 21.0422 36.6309 21.4963 36.5473 22.0808H40.6651ZM47.0873 20.3586V24.5546C47.0873 24.8468 47.1551 25.0608 47.2908 25.1965C47.4369 25.3218 47.677 25.3844 48.011 25.3844H49.0287V27.2319H47.6509C45.8034 27.2319 44.8797 26.3342 44.8797 24.5389V20.3586H43.8463V18.558H44.8797V16.4131H47.0873V18.558H49.0287V20.3586H47.0873ZM55.4901 18.4328C56.1477 18.4328 56.7322 18.5789 57.2437 18.8712C57.7552 19.153 58.1518 19.5757 58.4336 20.1394C58.7259 20.6926 58.872 21.3606 58.872 22.1434V27.2319H56.6801V22.4409C56.6801 21.752 56.5078 21.2249 56.1634 20.8596C55.8189 20.4838 55.3492 20.2959 54.7543 20.2959C54.1489 20.2959 53.6687 20.4838 53.3139 20.8596C52.9694 21.2249 52.7972 21.752 52.7972 22.4409V27.2319H50.6053V15.6459H52.7972V19.6384C53.079 19.2626 53.4548 18.9703 53.9245 18.7616C54.3942 18.5424 54.9161 18.4328 55.4901 18.4328ZM69.1449 18.558V27.2319H66.9373V26.1359C66.6555 26.5117 66.2849 26.8091 65.8257 27.0283C65.3768 27.2371 64.8863 27.3415 64.3539 27.3415C63.6755 27.3415 63.0753 27.2006 62.5534 26.9187C62.0315 26.6265 61.6192 26.2037 61.3165 25.6505C61.0243 25.0869 60.8781 24.4189 60.8781 23.6465V18.558H63.0701V23.3333C63.0701 24.0222 63.2423 24.5546 63.5867 24.9303C63.9312 25.2957 64.4009 25.4783 64.9959 25.4783C65.6012 25.4783 66.0762 25.2957 66.4206 24.9303C66.7651 24.5546 66.9373 24.0222 66.9373 23.3333V18.558H69.1449ZM73.4995 19.8262C73.7814 19.4087 74.1676 19.0695 74.6581 18.8086C75.1591 18.5476 75.728 18.4171 76.3647 18.4171C77.1058 18.4171 77.7738 18.5998 78.3688 18.9651C78.9742 19.3304 79.4491 19.8523 79.7935 20.5308C80.1484 21.1988 80.3259 21.9764 80.3259 22.8636C80.3259 23.7509 80.1484 24.5389 79.7935 25.2278C79.4491 25.9063 78.9742 26.4334 78.3688 26.8091C77.7738 27.1849 77.1058 27.3728 76.3647 27.3728C75.7176 27.3728 75.1487 27.2475 74.6581 26.997C74.178 26.7361 73.7918 26.4021 73.4995 25.995V27.2319H71.3076V15.6459H73.4995V19.8262ZM78.087 22.8636C78.087 22.3418 77.9774 21.8929 77.7582 21.5172C77.5494 21.131 77.2676 20.8387 76.9127 20.6404C76.5683 20.4421 76.1925 20.3429 75.7854 20.3429C75.3888 20.3429 75.013 20.4473 74.6581 20.656C74.3137 20.8544 74.0319 21.1466 73.8127 21.5328C73.6039 21.919 73.4995 22.3731 73.4995 22.895C73.4995 23.4169 73.6039 23.8709 73.8127 24.2571C74.0319 24.6433 74.3137 24.9408 74.6581 25.1495C75.013 25.3478 75.3888 25.447 75.7854 25.447C76.1925 25.447 76.5683 25.3426 76.9127 25.1339C77.2676 24.9251 77.5494 24.6276 77.7582 24.2414C77.9774 23.8552 78.087 23.396 78.087 22.8636Z"
//       fill="url(#bh_grad_a)"
//     />
//     <path
//       d="M8.96274 30.3487C7.96301 30.3487 6.9749 30.2325 5.99841 30C5.04518 29.7675 4.19656 29.4188 3.45257 28.9538C3.19683 28.7678 3.02246 28.5004 2.92946 28.1517C2.83646 27.7797 2.78996 27.3379 2.78996 26.8264C2.78996 25.9197 2.96433 24.8502 3.31308 23.618C3.66182 22.3625 4.10357 21.0721 4.63831 19.7469C5.17305 18.4217 5.73104 17.1662 6.31228 15.9805C6.89352 14.7947 7.41664 13.8182 7.88163 13.051C8.32338 12.3768 8.86975 11.9118 9.52074 11.656C10.1717 11.377 10.8576 11.2375 11.5783 11.2375C13.1361 11.2375 13.7987 11.377 13.5662 11.656C13.0779 12.214 12.5664 12.9464 12.0317 13.8531C11.497 14.7598 10.9971 15.6898 10.5321 16.6431C10.0671 17.5731 9.67186 18.3868 9.34636 19.0843C8.57912 20.7118 7.90488 22.3044 7.32364 23.8621C6.7424 25.3966 6.34716 26.6404 6.13791 27.5937C6.09141 27.7797 6.06816 27.9308 6.06816 28.047C6.06816 28.3028 6.14954 28.5353 6.31228 28.7445C6.47503 28.9305 6.76565 29.0584 7.18415 29.1281C7.34689 29.1514 7.49802 29.1746 7.63751 29.1979C7.80026 29.1979 7.96301 29.1979 8.12576 29.1979C9.00924 29.1979 9.82298 28.977 10.567 28.5353C11.311 28.0935 11.776 27.4542 11.962 26.6172C12.0317 26.3382 12.0549 26.0359 12.0317 25.7104C12.0317 25.1524 11.9503 24.5363 11.7876 23.8621C11.6248 23.1878 11.3807 22.5601 11.0552 21.9789C10.753 21.3976 10.3577 20.9675 9.86948 20.6885C9.63698 20.549 9.52074 20.3863 9.52074 20.2003C9.52074 19.991 9.64861 19.8631 9.90436 19.8166C10.4623 19.8166 11.032 19.5958 11.6132 19.154C12.2177 18.7123 12.7641 18.131 13.2523 17.4103C13.7638 16.6896 14.1707 15.9107 14.4729 15.0737C14.7984 14.2135 14.9612 13.3881 14.9612 12.5976C14.9612 11.4816 14.624 10.7144 13.9498 10.2959C13.2988 9.85417 12.5199 9.6333 11.6132 9.6333C10.846 9.6333 10.0555 9.74955 9.24174 9.98204C8.428 10.1913 7.71889 10.4354 7.1144 10.7144C5.81241 11.3189 4.71968 12.0978 3.83619 13.051C2.97596 14.0042 2.47609 14.9342 2.33659 15.841C2.22034 15.7945 1.99947 15.7363 1.67398 15.6666C1.34848 15.5968 1.02299 15.4573 0.69749 15.2481C0.395244 15.0388 0.220872 14.7366 0.174372 14.3414C0.104623 13.5276 0.302246 12.8069 0.767239 12.1791C1.25548 11.5281 1.9181 10.9818 2.75508 10.54C3.61532 10.075 4.55693 9.69142 5.57992 9.38918C6.62615 9.08693 7.68401 8.86606 8.7535 8.72656C9.82298 8.58706 10.8227 8.51731 11.7527 8.51731C12.1479 8.51731 12.5199 8.52894 12.8687 8.55219C13.2174 8.57544 13.5313 8.61031 13.8103 8.65681C15.6703 8.95906 17.0071 9.56355 17.8209 10.4703C18.6346 11.3538 19.0415 12.3419 19.0415 13.4346C19.0415 14.4111 18.7509 15.376 18.1696 16.3292C17.5884 17.2592 16.7863 18.0497 15.7633 18.7007C14.7635 19.3284 13.6127 19.6772 12.3107 19.7469C13.6592 20.0491 14.6938 20.7001 15.4145 21.6999C16.1585 22.6764 16.5305 23.7342 16.5305 24.8735C16.5305 25.8267 16.2515 26.745 15.6935 27.6285C15.1355 28.512 14.2404 29.1863 13.0082 29.6513C11.7992 30.1162 10.4507 30.3487 8.96274 30.3487Z"
//       fill="url(#bh_grad_b)"
//     />
//     <path
//       d="M23.3861 11.7715L26.1389 13.4328L30.266 10.9409L26.1389 8.44894L22.0117 10.9409H26.1389V11.7715H23.3861ZM22.0117 11.7715V15.094L22.8371 14.172V12.2699L22.0117 11.7715ZM26.1389 16.7553L24.0753 15.5094L23.2499 15.011V12.5191L26.1389 14.2634L29.0279 12.5191V15.011L26.1389 16.7553Z"
//       fill="#6C30D4"
//     />
//     <defs>
//       <linearGradient id="bh_grad_a" x1="20.1618" y1="32.584" x2="78.6193" y2="33.2017" gradientUnits="userSpaceOnUse">
//         <stop stopColor="#4F61E8" />
//         <stop offset="1" stopColor="#E924A1" />
//       </linearGradient>
//       <linearGradient id="bh_grad_b" x1="0.2958" y1="40.8169" x2="16.3262" y2="40.8423" gradientUnits="userSpaceOnUse">
//         <stop stopColor="#4F61E8" />
//         <stop offset="1" stopColor="#E924A1" />
//       </linearGradient>
//     </defs>
//   </svg>
// );

// ── Component ────────────────────────────────────────────────────────────────
function Login() {
  const navigate = useNavigate();
  const { login: loginAuth } = useAuthContext();


  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserLoginInput>({ resolver: yupResolver(loginSchema) });

  const handleLogin = async (data: UserLoginInput) => {
    setErrorMsg("");

    const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? "Mobile" : "Desktop";


    const hashedPassword = await Hashing(data.password);

    // const X_Tenant_ID = (import.meta.env.VITE_TENANT_ID as string) || "green";
    const payload = {
      username: data.userName,
      hashPassword: hashedPassword,
      inst: getTenantFromUrl(),
      deviceType,
      deviceIp: "",
    };

    try {
      setLoading(true);
      const response = await authService.login(payload);
      const result = response.data;

      // API-level error: HTTP 200 but non-success response code
      if (result.responseCode !== "99000") {
        setErrorMsg(result.responseMessage || "Login failed. Please check your credentials.");
        return;
      }

      // First-time login → force password change
      if (result.firstTimeLogin) {

        // ✅ Store tokens before navigating
        localStorage.setItem("username", data.userName);
        localStorage.setItem("roleId", result.roleId.toString());
        localStorage.setItem("token", result.token);
        localStorage.setItem("refreshToken", result.refreshToken);
        localStorage.setItem("accessTokenExpiresAt", String(Date.now() + result.tokenExpiresIn * 1000));
        localData.save("schoolInfo", result.schoolInfo);

        // Set auth header for subsequent requests
        API.defaults.headers.common.Authorization = `Bearer ${result.token}`;
        navigate("/auth/new-password");
        return;
      }

      // Decode JWT for auth context
      const user = getParsedToken(result.token);
      if (!user) {
        setErrorMsg("Invalid session token. Please try again.");
        return;
      }

      // ── Persist to localStorage ──────────────────────────────────────────
      // New th_* keys (TechHub spec)


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

      localStorage.setItem("accessTokenExpiresAt", String(Date.now() + result.tokenExpiresIn * 1000));
      loginAuth(result.token, { ...user, roleName: user.role }, result.refreshToken);

      // Hydrate auth context (sets "token" key in localStorage + user state)

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

      const friendlyMsg = /tenant .* not found or inactive/i.test(msg)
        ? "Invalid url. Use your school code, e.g. schoolcode.bluetsch.com"
        : msg;

      setErrorMsg(friendlyMsg);
      console.log("[error message]", friendlyMsg)
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-poppins flex flex-col gap-10 justify-center h-full  rounded-[18px] py-13 px-7.5 shadow-[0_4px_16px_0px_rgba(41,35,130,0.08),0_24px_64px_0px_rgba(41,35,130,0.13)]  lg:px-0  md:shadow-none md:max-w-md mx-auto lg:py-10">

      {/* <div className="md:mb-20 md:hidden">
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

      </div> */}


      <div>
        {/* ── Heading ── */}
        <div className="mb-8">
          <span className="text-xs font-Poppins font-bold text-chestnut uppercase tracking-widest">
            Welcome Back
          </span>
          <h1 className="text-2xl font-Poppins font-bold text-[#0F0F0E] mt-1">
            Sign in to your account
          </h1>
          <p className="text-gray-400 font-Poppins text-sm mt-1.5">
            Enter your credentials to continue
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
        <form onSubmit={handleSubmit(handleLogin)} className="space-y-5" noValidate>

          {/* Username */}
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

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block font-Poppins text-sm font-semibold text-[#0F0F0E]">
                Password
              </label>
              <button
                type="button"
                onClick={() => navigate("/auth/forgot-password")}
                className="text-xs font-Poppins font-semibold text-chestnut hover:opacity-70 transition-opacity"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3  top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="password"
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full border font-Poppins border-gray-200 rounded-lg pl-9 pr-11 py-2.5 text-sm outline-none focus:ring-2 focus:ring-chestnut/30 focus:border-chestnut/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs pl-1 font-space-grotesk">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-Poppins rounded-lg bg-chestnut text-white text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}

export default Login;
