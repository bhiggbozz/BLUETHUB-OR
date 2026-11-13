import { useEffect, useRef, useState } from "react";
import { EllipsisVertical, Camera, Plus, CircleAlert, CalendarIcon, Loader2, Info, LayoutGrid, Menu, ArrowLeft } from "lucide-react";
import { format } from "date-fns"
import { Button, Calendar, Input, Label, Popover, PopoverContent, PopoverTrigger } from "@bluethub/ui-kit";
import { cn } from "@/lib/utils";
import { type IcreateUserRequest } from "@/services/auth";


const Enrollment = () => {
      const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
    // const [fileName, setFileName] = useState<string | null>(null);
    // const [dragActive, setDragActive] = useState(false);
    const [classDialogOpen, setClassDialogOpen] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [successfully, setSuccessfully] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate()


    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<StudentFormValues>({
        resolver: yupResolver(studentFormSchema) as Resolver<StudentFormValues>,
        defaultValues: {
            firstName: '',
            lastName: '',
        },
    });

    const firstName = watch("firstName");
    const lastName = watch("lastName");
    const studentName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
    const username = `${firstName ?? ""}.${lastName ?? ""}`.toLowerCase().trim();
    const TDob = watch("dateOfBirth")

    // Auto-generate username whenever firstName or lastName changes
    useEffect(() => {
        if (firstName || lastName) {
            const generated = `${firstName ?? ''}.${lastName ?? ''}`.toLowerCase().trim();
            setValue("username", generated);
        }
    }, [firstName, lastName, setValue]);


    const handleClick = () => fileRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoPreview(URL.createObjectURL(file));
    };

    // const handleDrag = (e: React.DragEvent) => {
    //     e.preventDefault();
    //     e.stopPropagation();
    //     setDragActive(e.type === "dragenter" || e.type === "dragover");
    // };

    // const handleDrop = (e: React.DragEvent) => {
    //     e.preventDefault();
    //     e.stopPropagation();
    //     setDragActive(false);
    //     if (e.dataTransfer.files?.[0]) {
    //         setFileName(e.dataTransfer.files[0].name);
    //     }

    // };

    const schoolId = localData.retrieve("schoolInfo") as SchoolInfo
    const createdBy = localData.retrieve("user") as Tuser

    const handleRegister = async (data: StudentFormValues) => {
        if (!schoolId?.id) {
            console.error("School info is missing. Cannot proceed.");
            return;
        }

        const phassed = `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}`.trim();
        if (!phassed) return;

        const hashPassword = await Hashing(phassed);

        const payload: IcreateUserRequest = {
            createdby: createdBy.id,
            firstName: data.firstName,
            lastName: data.lastName,
            hashPassword,
            emailAddress: '',
            isActive: true,
            hasAccess: true,
            userName: phassed,
            schoolId: schoolId.id,
            dob: format(new Date(data.dateOfBirth!), 'yyyy-MM-dd'),
            role: UserRole.Student,
        };

        localData.save("th_student", payload);

        try {
            setLoading(true);
            // fake 3s loading before opening dialog
            await new Promise(resolve => setTimeout(resolve, 3000));
            setClassDialogOpen(true);
        } catch (error) {
            const msg =
                error instanceof AxiosError
                    ? error.response?.data?.responseMessage ??
                    error.response?.data?.message ??
                    error.message
                    : (error as Error).message;
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    const onReset = () => {
        reset();
        setSuccessfully(false)
    }

    return (
        <>
            <div className="lg:p-3 font-poppins">
                <div className="backdrop-blur-sm lg:rounded-2xl border border-border/40 overflow-hidden">
                    <div
                        className="flex items-center justify-between px-5 h-12 sticky top-0 z-30 bg-chestnut">
                        <div className="flex items-center gap-2.5">
                            <LayoutGrid className="w-5 h-5 text-white lg:inline hidden" />
                            <Menu className="lg:hidden text-white" onClick={openMobileNav} />
                            <ArrowLeft  className="lg:hidden text-white"  onClick={() => navigate(-1)}/>
                            <span className="text-white font-semibold text-sm">Register Student</span>
                        </div>
                        <EllipsisVertical className="text-white" />
                    </div>

                    {successfully ? (
                        <StudentRegisteredSuccessfully firstName={firstName} lastName={lastName} setSuccessfully={setSuccessfully} onReset={onReset} />
                    ) : (
                        <div className="bg-background/70 backdrop-blur-sm px-8 pb-8 pt-6">

                            {/* Step badge */}
                            <div className="inline-flex items-center gap-2 bg-chestnut/8 rounded-full pl-1.5 pr-3 py-1 mb-5">
                                <span className="w-5 h-5 rounded-full bg-chestnut text-white text-[10px] font-bold flex items-center justify-center">
                                    1
                                </span>
                                <span className="text-[11px] font-bold text-chestnut tracking-wide uppercase">
                                    Personal Information
                                </span>
                            </div>

                            {/* ── Avatar ──────────────────────────────────────────── */}
                            <div className="flex items-center gap-4 pb-5 border-b border-chestnut/10 mb-6">
                                <div
                                    onClick={handleClick}
                                    className="relative w-[72px] h-[72px] rounded-full border-[2.5px] border-chestnut bg-chestnut/5 flex items-center justify-center cursor-pointer group overflow-hidden flex-shrink-0"
                                >
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <svg className="w-7 h-7 text-chestnut/40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                        </svg>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Camera className="text-white w-5 h-5" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-chestnut mb-0.5">Profile Picture</h3>
                                    <p className="text-xs text-muted-foreground">JPG or PNG · max 2MB · passport-style photo</p>
                                    <span className="mt-1.5 inline-block text-[10px] font-bold text-chestnut bg-chestnut/8 border border-chestnut/20 rounded-full px-3 py-0.5 tracking-wide uppercase">
                                        Click to upload
                                    </span>
                                </div>
                                <input
                                    type="file"
                                    ref={fileRef}
                                    accept="image/png, image/jpeg"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>

                            <form onSubmit={handleSubmit(handleRegister)} className="lg:w-[766px] mx-auto space-y-2.5 mt-[50px]">

                                {errorMsg && (
                                    <div
                                        role="alert"
                                        className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-5 dark:bg-red-950 dark:border-red-900 dark:text-red-400"
                                    >
                                        <Info className="w-4 h-4 mt-0.5 shrink-0 text-red-500 dark:text-red-400" />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-chestnut text-sm font-semibold">First Name</Label>
                                        <Input {...register("firstName")} placeholder="student name" />
                                        {errors.firstName && (
                                            <p className="text-red-500 dark:text-red-400 text-xs mt-1 pl-2">{errors.firstName.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-chestnut text-sm font-semibold">Last  Name</Label>
                                        <Input {...register("lastName")} placeholder="student last name" />
                                        {errors.lastName && (
                                            <p className="text-red-500 dark:text-red-400 text-xs mt-1 pl-2">{errors.lastName.message}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-chestnut text-sm font-semibold">Middle Name </Label>
                                    <Input {...register("middleName")} placeholder="student middle name" />
                                    {errors.middleName && (
                                        <p className="text-red-500 dark:text-red-400 text-xs mt-1 pl-2">{errors.middleName.message}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-chestnut text-sm font-semibold">Username</Label>
                                        <Input readOnly placeholder="Auto-generated" {...register("username")} />
                                        {errors.username && (
                                            <p className="text-red-500 dark:text-red-400 text-xs mt-1 pl-2">{errors.username.message}</p>
                                        )}
                                    </div>

                                    <Controller
                                        name="dateOfBirth"
                                        control={control}
                                        rules={{ required: "Date of birth is required" }}
                                        render={({ field }) => (
                                            <div className="space-y-1.5 mt-1.5">
                                                <Label className="text-chestnut text-xs font-bold">
                                                    Date of Birth
                                                </Label>

                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full justify-start gap-2 font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="w-4 h-4 shrink-0" />
                                                            {field.value
                                                                ? format(new Date(field.value), "dd MMM yyyy")  // ← wrap in new Date() to be safe
                                                                : "Select date of birth"}
                                                        </Button>
                                                    </PopoverTrigger>

                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            initialFocus
                                                            captionLayout="dropdown"
                                                            fromYear={1990}
                                                            toYear={new Date().getFullYear()}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                {errors.dateOfBirth && (
                                                    <p className="text-red-500 dark:text-red-400 text-xs mt-1 pl-2">{errors.dateOfBirth.message}</p>
                                                )}
                                            </div>
                                        )}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-chestnut text-sm font-semibold">Guardian  Name (optional)</Label>
                                    <Input {...register("guardianName")} placeholder="student Guardian name" />
                                    {errors.guardianName && (
                                        <p className="text-red-500 dark:text-red-400 text-xs mt-1 pl-2">{errors.guardianName.message}</p>
                                    )}
                                </div>

                                <div className="mt-7 flex items-center justify-center flex-col">
                                    {/* Register button */}
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full md:w-auto gap-2 px-8 py-3 mb-3"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                                <span>Creating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="size-4" aria-hidden="true" />
                                                <span>Continue</span>
                                            </>
                                        )}
                                    </Button>

                                    {/* Hint */}
                                    <div className="flex items-center gap-1.5">
                                        <CircleAlert className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <span className="text-[11px] text-muted-foreground">
                                            You can add multiple student one after another
                                        </span>
                                    </div>
                                </div>
                            </form>
                        </div>)}
                </div>
            </div>

            <ClassDialog
                open={classDialogOpen}
                onOpenChange={setClassDialogOpen}
                studentName={studentName}
                studentUsername={username}
                studentDob={TDob ? format(new Date(TDob), 'dd MMM yyyy') : "—"}
                onSave={(data) => {
                    setSuccessfully(true)
                    data // { assignedClass, levels, subjects }
                }}
            />
        </>
    )
};
export default Enrollment;


import { motion } from "framer-motion";
import ClassDialog from "./class-dialog";
import { useNavigate, useOutletContext } from "react-router-dom";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { studentFormSchema, UserRole, type StudentFormValues } from "@/utils/validate";
import { AxiosError } from "axios";
import { Hashing, localData } from "@/utils";
import type { Tuser } from "@/utils/decode";
import type { SchoolInfo } from "@/services";

const AnimatedSuccessIcon = () => {
    return (
        <motion.div
            initial={{ scale: 0.6, opacity: 0, filter: "blur(6px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            transition={{
                type: "spring",
                stiffness: 200,
                damping: 12,
            }}
            className="relative flex items-center justify-center"
        >
            {/* Glow */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                    scale: [1, 1.4],
                    opacity: [0.3, 0],
                }}
                transition={{
                    duration: 1,
                    ease: "easeOut",
                }}
                className="absolute w-28 h-28 rounded-full bg-green-400/30"
            />

            {/* Circle */}
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center">
                <svg viewBox="0 0 52 52" className="w-10 h-10" fill="none">
                    <motion.path
                        d="M14 27 L22 35 L38 19"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{
                            pathLength: 1,
                            rotate: [0, 10, -10, 0],
                        }}
                        transition={{
                            duration: 0.5,
                            ease: "easeInOut",
                            delay: 0.2,
                        }}
                    />
                </svg>
            </div>
        </motion.div>
    );
};

const StudentRegisteredSuccessfully = ({ onReset, firstName, lastName }: {firstName: string, lastName: string, setSuccessfully: (boolean: false) => void; onReset: () => void }) => {
    const navigate = useNavigate()
    return (
        <div className="min-h-[80vh] bg-background/70 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="w-full max-w-md text-center space-y-6">

                {/* 🔥 Animated Success Icon */}
                <AnimatedSuccessIcon />

                {/* TEXT */}
                <div className="space-y-2">
                    <h3 className="text-foreground font-semibold text-xl">
                        Student registered successfully!
                    </h3>

                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {firstName} {lastName} has been added to{" "}
                        <span className="font-medium text-foreground">
                            JSS 1A Section
                        </span>{" "}
                        for the{" "}
                        <span className="font-medium text-foreground">
                            2026 / 2027
                        </span>{" "}
                        session.
                    </p>
                </div>

                {/* ACTIONS */}
                <div className="space-y-3 pt-2">
                    <Button variant="outline" onClick={() => { onReset(); }} className="w-full gap-2.5 py-3 rounded-xl">
                        <Plus className="w-4 h-4" />
                        Add Another Student
                    </Button>

                    <Button onClick={() => navigate("/admin/registration/student")} className="w-full py-3 rounded-xl">
                        View All Students
                    </Button>
                </div>
            </div>
        </div>
    );
};

