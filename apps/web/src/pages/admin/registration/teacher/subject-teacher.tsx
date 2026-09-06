import { cn } from "@/lib/utils";
import { authService, type IcreateUserRequest } from "@/services/auth";
import { Hashing, localData } from "@/utils";
import type { Tuser } from "@/utils/decode";
import { regUserSchema, UserRole, type RegisterFormData } from "@/utils/validate";
import { Label, Input, Button, Popover, PopoverTrigger, PopoverContent, Calendar } from "@bluethub/ui-kit";
import { yupResolver } from "@hookform/resolvers/yup";
import { AxiosError } from "axios";
import { format } from "date-fns";
import { Upload, User, Camera, Mail, Loader2, Info, CalendarIcon, ArrowLeft, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";

const SubjectTeacher = () => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState<boolean>(false)
  const [user, setUser] = useState<Tuser | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate()
  const isClassTeacherRegistration = location.pathname.includes("/class-teacher");
  const isAdminRegistration = location.pathname.includes("/admin-user");
  const selectedTeacherRole = isClassTeacherRegistration ? UserRole.ClassTeacher : UserRole.SubjectTeacher;
  const isEdit = (location.state as any)?.isEdit ?? false;
  const editUserData = (location.state as any)?.editUser ?? null;


  // Load user from localStorage when component mounts
  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
      try {
        const parsedUser: Tuser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse user from localStorage:', error);
        localStorage.removeItem('user'); // clear corrupted data
      }
    }
  }, []);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      setFileName(file.name);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFileName(e.dataTransfer.files[0].name);
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm({ resolver: yupResolver(regUserSchema) });


  const firstName = watch("firstName");
  const lastName = watch("lastName");

  // Auto-generate username whenever firstName or lastName changes
  useEffect(() => {
    if (isEdit) return; // skip auto-generation in edit mode
    if (firstName || lastName) {
      const generated = `${firstName?.trim() ?? ''}.${lastName?.trim() ?? ''}`.toLowerCase().trim();
      setValue("username", generated);
      setValue("password", generated);
    }
  }, [firstName, lastName, setValue, isEdit]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Pre-fill form when in edit mode
  useEffect(() => {
    if (isEdit && editUserData) {
      reset({
        firstName: editUserData.firstName ?? "",
        lastName: editUserData.lastName ?? "",
        middleName: "",
        email: editUserData.emailAddress ?? "",
        username: editUserData.userName ?? "",
        password: editUserData.userName ?? "",
        dateOfBirth: editUserData.dob ? new Date(editUserData.dob) : undefined,
      });
    }
  }, [isEdit, editUserData, reset]);

  const handleRegister = async (data: RegisterFormData) => {
    if (!user?.schoolId && !user?.id) return

    const hashPassword = await Hashing(data.password);
    const payload: IcreateUserRequest = {
      createdby: user?.id,
      firstName: data.firstName,
      lastName: data.lastName,
      emailAddress: data.email,
      hashPassword,
      isActive: true,
      hasAccess: true,
      userName: data.username,
      schoolId: user?.schoolId,
      dob: format(new Date(data.dateOfBirth!), 'yyyy-MM-dd'),
      role: isAdminRegistration ? UserRole.Admin : selectedTeacherRole,
    }
    try {
      setErrorMsg("")
      setSuccessMsg("")
      setLoading(true);
      if (isEdit && editUserData) {
        // The password field is pre-filled with the username just to satisfy
        // regUserSchema's required() validator on this shared create/edit
        // form — it's not a real password entry. Only send hashPassword if
        // the admin actually changed it away from that pre-filled default;
        // otherwise this silently resets the account's password on every edit.
        const passwordChanged = data.password !== editUserData.userName;

        await authService.editUser({
          id: editUserData.id,
          firstName: data.firstName,
          lastName: data.lastName,
          emailAddress: data.email ?? "",
          ...(passwordChanged ? { hashPassword } : {}),
          isActive: true,
          hasAccess: true,
          roleId: editUserData.roleId ?? 0,
          profileImage: "",
          guardianName: "",
        });
        setSuccessMsg("User updated successfully.");
      } else if (isAdminRegistration) {
        await authService.createUser(payload);
        reset({
          firstName: "",
          lastName: "",
          middleName: "",
          username: "",
          email: "",
          dateOfBirth: undefined,
          password: "",
        });
        setFileName(null);
        setDragActive(false);
        setSuccessMsg("User created successfully.");
      } else {
        await new Promise(resolve => setTimeout(resolve, 3000));
        localData.save("th_t", payload)
        navigate('/admin/registration/teacher/assign-role')
      }
    } catch (error) {
      const msg =
        error instanceof AxiosError
          ? error.response?.data?.responseMessage ??
          error.response?.data?.message ??
          error.message
          : (error as Error).message;
      setSuccessMsg("");
      setErrorMsg(msg);
      // 409 duplicate-user conflict — the backend's message names the
      // colliding field (email checked first, then username); mirror it
      // onto that field so it's not just a generic top-of-form banner.
      if (error instanceof AxiosError && error.response?.status === 409) {
        if (/email/i.test(msg)) setError("email", { type: "manual", message: msg });
        else if (/username/i.test(msg)) setError("username", { type: "manual", message: msg });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    // "space-y-4 px-6 max-w-full min-w-[80%] mx-auto"
    <div className="space-y-4 lg:p-3 font-poppins">

      {/* Main Content */}
      <div className="bg-white/90 backdrop-blur-sm lg:rounded-2xl border border-white/20 shadow-xl overflow-hidden">
        {/* Section Header */}
        <div className="bg-linear-to-r from-chestnut to-chestnut/90 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg  hidden lg:flex items-center justify-center ">
              <User className="w-5 h-5 text-white " />
            </div>
            <ArrowLeft className="lg:hidden text-white" onClick={() => navigate(-1)} />
            <div>
              <h2 className="lg:font-semibold  font-medium text-sm text-white">
                {isAdminRegistration
                  ? "Admin Details"
                  : isClassTeacherRegistration
                    ? "Class Teacher Details"
                    : "Subject Teacher Details"}
              </h2>
              <p className="text-white/80 text-xs">
                Fill in the required information
              </p>
            </div>
          </div>

          <ArrowLeft className="md:block hidden  text-white" onClick={() => navigate(-1)} />
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(handleRegister)} className="p-8 bg-linear-to-br from-white/95 to-white/85 min-h-[80vh]">
          <div className="flex flex-col lg:flex-row gap-7 md:gap-12">
            {/* Profile Picture Upload */}
            <div className="space-y-3">
              <Label className="text-chestnut font-medium text-sm flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Profile Picture*
              </Label>

              <label
                htmlFor="fileInput"
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`group relative flex items-center justify-center flex-col gap-4 
      border-2 border-dashed w-full md:w-60 h-50 rounded-2xl cursor-pointer 
      transition-all duration-300 overflow-hidden
      ${dragActive
                    ? "border-chestnut bg-chestnut/10 scale-105"
                    : fileName
                      ? "border-green-500 bg-green-50"
                      : "border-chestnut/40 hover:border-chestnut bg-chestnut/5 hover:bg-chestnut/10"
                  }`}
              >
                <Input
                  type="file"
                  id="fileInput"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*"
                />

                {previewUrl ? (
                  <>
                    {/* Actual image preview fills the drop zone */}
                    <img
                      src={previewUrl}
                      alt="Profile preview"
                      className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Dark overlay + info on hover so the box still reads as "click to change" */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-300 flex items-center justify-center">
                      <p className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-xs font-semibold px-3 text-center">
                        Click or drag to change image
                      </p>
                    </div>

                    {/* Small "selected" badge, always visible */}
                    <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1 shadow-md">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-linear-to-br from-chestnut/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    <div className="p-4 rounded-full transition-all duration-300 bg-chestnut/10 group-hover:bg-chestnut/20">
                      <Upload className="w-8 h-8 text-chestnut" />
                    </div>

                    <div className="text-center px-4 space-y-1">
                      <p className="font-semibold text-sm text-chestnut group-hover:text-chestnut/80 transition-colors">
                        Upload Image
                      </p>
                      <p className="text-xs text-chestnut/60 font-medium">
                        Click or drag to select file
                      </p>
                    </div>
                  </>
                )}
              </label>

              {fileName && (
                <p className="text-xs text-green-600 font-medium truncate max-w-60">
                  {fileName}
                </p>
              )}
            </div>

            {/* Form Fields */}
            <div className="flex-1 space-y-4">
              {/* Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                <div className="space-y-2">
                  <Label className="text-chestnut font-medium text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    First Name
                  </Label>
                  <div className="relative">
                    <Input
                      {...register("firstName")}
                      type="text"
                      placeholder="Enter first name"
                      className="ring-2 ring-chestnut/30 focus:ring-chestnut border-0 py-4 px-4 text-sm placeholder:text-chestnut/50 bg-white/80 backdrop-blur-sm rounded-md transition-all duration-300 hover:ring-chestnut/30"
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-chestnut font-medium text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Last Name
                  </Label>
                  <Input
                    {...register("lastName")}
                    type="text"
                    placeholder="Enter last name"
                    className="ring-2 ring-chestnut/30 focus:ring-chestnut border-0 py-4 px-4 text-sm placeholder:text-chestnut/50 bg-white/80 backdrop-blur-sm rounded-md transition-all duration-300 hover:ring-chestnut/30"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                <div className="space-y-1">
                  <Label className="text-chestnut font-medium text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Middle Name
                  </Label>
                  <Input
                    {...register("middleName")}
                    type="text"
                    placeholder="Enter middle name"
                    className="ring-2 ring-chestnut/30 focus:ring-chestnut border-0 py-4 px-4 text-sm placeholder:text-chestnut/50 bg-white/80 backdrop-blur-sm rounded-md transition-all duration-300 hover:ring-chestnut/30"
                  />
                  {errors.middleName && (
                    <p className="text-red-500 text-sm mt-1">{errors.middleName.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-chestnut font-medium text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Username
                  </Label>
                  <Input
                    {...register("username")}
                    type="text"
                    readOnly
                    placeholder="Auto-generated"
                    className="ring-2 ring-chestnut/30 focus:ring-chestnut border-0 py-4 px-4
             text-base placeholder:text-chestnut/50 bg-chestnut/5 rounded-md
             cursor-not-allowed opacity-70"
                  />
                  {errors.username && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.username.message} Try adjusting the name fields above to change it.
                    </p>
                  )}
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                <div className="space-y-1">
                  <Label className="text-chestnut font-medium text-sm flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    {...register("email")}
                    type="text"
                    placeholder="Enter  email address"
                    className="ring-2 ring-chestnut/30 focus:ring-chestnut border-0 py-4 px-4 text-xs placeholder:text-chestnut/50 bg-white/80 backdrop-blur-sm rounded-md transition-all duration-300 hover:ring-chestnut/30"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>

                <Controller
                  name="dateOfBirth"
                  control={control}
                  rules={{ required: "Date of birth is required" }}
                  render={({ field }) => {


                    return (
                      <div className="space-y-1.5">
                        <Label className="text-chestnut text-base font-medium">
                          Date of Birth
                        </Label>

                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <div
                              className={cn(
                                "w-full ring-2 ring-chestnut/40 bg-transparent rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 outline-none hover:ring-chestnut/50 transition cursor-pointer",
                                field.value ? "text-chestnut" : "text-chestnut/30"
                              )}
                            >
                              <CalendarIcon className="w-4 h-4 text-chestnut/50 shrink-0" />
                              {field.value
                                ? format(new Date(field.value), "dd MMM yyyy")
                                : "Select date of birth"}
                            </div>
                          </PopoverTrigger>

                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => {
                                field.onChange(date);
                                setOpen(false); // close popover right after picking a date
                              }}
                              initialFocus
                              captionLayout="dropdown"
                              fromYear={1990}
                              toYear={new Date().getFullYear()}
                            />
                          </PopoverContent>
                        </Popover>
                        {errors.dateOfBirth && (
                          <p className="text-red-500 text-xs mt-1 pl-2">{errors.dateOfBirth.message}</p>
                        )}
                      </div>
                    );
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between md:mt-12 pt-8 border-t border-chestnut/10">
            {errorMsg && (
              <div
                role="alert"
                className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-5"
              >
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}
            {!errorMsg && successMsg && (
              <div
                role="status"
                className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 text-sm mb-5"
              >
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="md:ml-auto flex-1 md:flex-0 bg-linear-to-r from-chestnut to-chestnut/90 hover:from-chestnut/90 hover:to-chestnut text-white font-medium text-sm py-7 px-7 rounded-md shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Save and Continue</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubjectTeacher;

// make Add subject  a dialog then after pick your subject then submit let the subject that hae been picked show inside Register Subject
