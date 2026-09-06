import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, CheckCircle2 } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogTrigger,
    Button,
    Input
} from "@bluethub/ui-kit";
import { Dots } from "./subject-register-dialog";
import InfoRow from "@/shared/info-row";
import type { Subject } from "../main";
// import { useNavigate } from "react-router-dom";


const EditSubjectModal = ({ onAction }: { onAction: Subject }) => {
    const [subject, setSubject] = useState(onAction.name);
    const [open, setOpen] = useState(false);
    const [openChanges, setOpenChange] = useState(false);

    const onOpenChange = () => {
        setOpen(true)
    }

    // const navigate = useNavigate()

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogTrigger
                >
                    <Button
                        onClick={() => setOpen(true)}
                        className="text-[11px] font-semibold hover:opacity-70 transition-opacity bg-chestnut"
                    >
                        Edit
                    </Button>
                </DialogTrigger>

                <DialogContent showCloseButton={false} className="p-0 gap-0 rounded-md border-0 shadow-2xl max-w-md w-full overflow-hidden">
                    <div
                        className="flex items-center justify-between px-5 py-4 bg-chestnut">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                <Pencil size={14} className="text-white" />
                            </div>
                            <p className="text-white text-sm font-semibold">Edit Subject</p>
                        </div>

                        <button
                            onClick={() => setOpen(false)}
                            className="w-7 h-7 flex items-center justify-center rounded-md bg-white/20 hover:bg-white/30"
                        >
                            <X size={14} className="text-white" />
                        </button>
                    </div>

                    {/* CONTENT */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25 }}
                            className="px-5 py-5 space-y-5 bg-white"
                        >

                            {/* CURRENTLY EDITING CARD */}
                            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-[#2D2A8C] flex items-center justify-center text-white text-xs font-bold">
                                        {onAction?.name
                                            ?.split(" ")
                                            .map((word) => word.charAt(0).toUpperCase())
                                            .join("")}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400">currently Editing</p>
                                        <p className="text-xs font-semibold text-gray-800">
                                            {onAction.name}
                                        </p>
                                    </div>
                                </div>

                                <span className="text-xs font-semibold text-[#2D2A8C]">
                                    {onAction.subjectCategoryName}
                                </span>
                            </div>

                            {/* SUBJECT NAME */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600">
                                    Subject Name
                                </label>

                                <div className="relative mt-1.5">
                                    <Input
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="pr-8 text-xs rounded-md"
                                    />

                                    {subject && (
                                        <button
                                            onClick={() => setSubject("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>



                            {/* FOOTER */}
                            <div className="flex justify-end gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                    className="text-xs rounded-lg px-4"
                                >
                                    Cancel
                                </Button>

                                <Button
                                    onClick={() => setOpenChange(true)}
                                    className="text-xs text-white rounded-md px-5 bg-chestnut">
                                    Submit
                                </Button>
                            </div>

                        </motion.div>
                    </AnimatePresence>
                </DialogContent>
            </Dialog>

            <ChangeSaved
                open={openChanges}
                onClose={() => (setOpen(false), setOpenChange(false))}
                onAddAnother={() => (setOpen(false), setOpenChange(false))}
                onViewAll={() => (setOpen(false), setOpenChange(false))}
            />
        </>
    );
};


export default EditSubjectModal



const ChangeSaved = (
    { open, onClose, onAddAnother, onViewAll }: { open: boolean; onClose: () => void; onAddAnother?: () => void; onViewAll?: () => void }) => {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-90 p-0 overflow-hidden rounded-2xl border-0 shadow-2xl bg-white gap-0">
                {/* ── Hero Banner ── */}
                <div className="relative bg-chestnut flex flex-col items-center pt-10 pb-8 overflow-hidden">
                    <Dots />

                    {/* Icon */}
                    <div className="relative z-10 w-14 h-14 rounded-full bg-white/10 border-2 border-emerald-400 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                        <CheckCircle2 size={28} className="text-emerald-400" />
                    </div>

                    <h2 className="relative z-10 text-white text-base font-semibold  mb-1">
                        Changes Saved!
                    </h2>
                    <p className="relative z-10 text-[#FFFFFFBF] text-sm font-normal text-center leading-snug px-10">
                        Subject updated successfully across the portal
                    </p>
                </div>

                {/* ── Info Rows ── */}
                <div className="px-5 pt-5 pb-4 space-y-2.5">
                    <InfoRow label="Subject" value="Basic Technology " />
                    <InfoRow
                        label="Status"
                        value="Updated"
                        valueClass="text-emerald-500 text-sm font-medium"
                        registered
                    />
                </div>

                {/* ── Divider ── */}
                <div className="mx-5 border-t-2 border-gray-100" />

                {/* ── Actions ── */}
                <div className="flex items-center justify-end gap-3 px-5 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onAddAnother}
                        className="text-xs px-5 border-gray-300 text-chestnut hover:bg-gray-50 rounded-lg"
                    >
                        Edit Another
                    </Button>
                    <Button
                        size="sm"
                        onClick={onViewAll}
                        className="text-xs px-5 bg-chestnut hover:bg-[#2d2a6e] text-white rounded-md"
                    >
                        Back to List
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}