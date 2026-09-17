import {
    MoreVertical,
    Plus,
    Share2,
    MessageSquare,
    Trash2,
    LogOut,
    UserPlus,
} from "lucide-react";
import { useState } from "react";
import { GroupSection } from "./group-section";
import { StatusDot } from "./status-dot";
import { TeacherStatusBadge } from "./teacher-badge";
import { ProblemBadge } from "./problem-badge";
import { ResourceIcon } from "./resource-Icon";
import InviteTeacherModal from "../component/invite-teacher-modal";
import { Link } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────────────
export type MemberStatus = "Online" | "Away" | "Offline";
export type TeacherStatus = "Available" | "In Class";
export type ProblemStatus = "Solved" | "Open";

export interface Member {
    id: string;
    name: string;
    initials: string;
    color: string;
    class: string;
    status: MemberStatus;
    isYou?: boolean;
    isHost?: boolean;
}

export interface Teacher {
    id: string;
    name: string;
    subject: string;
    initials: string;
    color: string;
    status: TeacherStatus;
    invited?: boolean;
}

export interface Problem {
    id: string;
    title: string;
    status: ProblemStatus;
    postedBy: string;
    time: string;
}

export interface Resource {
    id: string;
    name: string;
    type: "pdf" | "image" | "doc";
    uploadedBy: string;
    when: string;
    size: string;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
export const MEMBERS: Member[] = [
    { id: "ao", name: "Adaeze Okafor", initials: "AO", color: "bg-orange-400", class: "SS2 Science · Online now", status: "Online", isYou: true, isHost: true },
    { id: "cu", name: "Chidi Uzoma", initials: "CU", color: "bg-purple-500", class: "SS2 Science · Online now", status: "Online" },
    { id: "nk", name: "Ngozi Kalu", initials: "NK", color: "bg-red-500", class: "SS2 Science · Online now", status: "Online" },
    { id: "eb", name: "Emeka Bello", initials: "EB", color: "bg-green-600", class: "SS2 Science · Online now", status: "Online" },
    { id: "tf", name: "Taiwo Falade", initials: "TF", color: "bg-yellow-500", class: "SS2 Science · Last seen 1h ago", status: "Away" },
];

export const TEACHERS: Teacher[] = [
    { id: "t1", name: "Mr. Emeka Nwosu", subject: "Further Mathematics", initials: "EN", color: "bg-indigo-500", status: "Available", invited: true },
    { id: "t2", name: "Mrs. Aisha Umar", subject: "Further Mathematics", initials: "AU", color: "bg-orange-400", status: "Available" },
    { id: "t3", name: "Mr. Tunde Adeyemi", subject: "Chemistry", initials: "TA", color: "bg-teal-500", status: "In Class" },
];

export const PROBLEMS: Problem[] = [
    { id: "p1", title: "Find T10 and S10 for the AP: 3, 7, 11, 15...", status: "Solved", postedBy: "FinikeBalo", time: "9:11 AM" },
    { id: "p2", title: "Find n such that Sn = 300 for this sequence", status: "Open", postedBy: "Mr. Nwosu", time: "9:21 AM" },
    { id: "p3", title: "Prove that Tn = a + (n−1)d from first principles", status: "Open", postedBy: "Adaeze", time: "9:18 AM" },
];

export const RESOURCES: Resource[] = [
    { id: "r1", name: "AP & GP Summary Notes.pdf", type: "pdf", uploadedBy: "Ngozi", when: "9:15 AM", size: "234 KB" },
    { id: "r2", name: "AP Formula Diagram.jpg", type: "image", uploadedBy: "Chidi", when: "Yesterday", size: "1.2 MB" },
    { id: "r3", name: "Past Questions — Sequences 2024.pdf", type: "pdf", uploadedBy: "Adaeze", when: "2 days ago", size: "870 KB" },
];





function GroupDetailPanel() {
    // const { groupName } = useParams();
    const [invitedTeacherId, setInvitedTeacherId] = useState<string | null>("t1");
    const [inviteOpen, setInviteOpen] = useState(false);
    const groupId = "group-123";

    return (
        <>
            <div className="flex flex-col bg-gray-50 min-h-screen">

                {/* ── Hero ── */}
                <div className="bg-gradient-to-br from-[#3730a3] via-[#4338ca] to-[#6366f1] px-5 pt-8 pb-6 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-white/10 translate-x-16 -translate-y-10 pointer-events-none" />

                    {/* Group icon */}
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl mx-auto mb-3">📐</div>
                    <h2 className="text-white text-lg font-extrabold text-center">Maths Olympiad Prep</h2>
                    <p className="text-white/60 text-xs text-center mt-0.5 mb-4">📚 Further Mathematics · Mr. Emeka Nwosu</p>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-2 mb-5">
                        {[
                            { val: MEMBERS.length, label: "Members" },
                            { val: MEMBERS.filter((m) => m.status === "Online").length, label: "Online" },
                            { val: 12, label: "Messages" },
                            { val: PROBLEMS.length, label: "Problems" },
                        ].map(({ val, label }) => (
                            <div key={label} className="bg-white/15 rounded-xl py-2 text-center">
                                <p className="text-white font-extrabold text-base">{val}</p>
                                <p className="text-white/60 text-[10px]">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Link to={`${groupId}`}
                            className="flex-1 flex items-center justify-center gap-2 bg-white text-[#4338ca] font-semibold text-sm py-2.5 rounded-full hover:bg-indigo-50 transition-colors"
                        >
                            <MessageSquare size={15} /> Open Chat
                        </Link>
                        <button className="flex-1 flex items-center justify-center gap-2 bg-white/20 text-white font-semibold text-sm py-2.5 rounded-full hover:bg-white/30 transition-colors">
                            <Share2 size={15} /> Share
                        </button>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="flex flex-col gap-3 px-3 py-4">

                    {/* Members */}
                    <GroupSection title="Members" count={MEMBERS.length}>
                        <div className="divide-y divide-gray-50">
                            {MEMBERS.map((m) => (
                                <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                                    <div className={`w-9 h-9 rounded-full ${m.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                                        {m.initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-semibold text-gray-700 truncate">{m.name}</p>
                                            {m.isYou && <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-semibold">You</span>}
                                            {m.isHost && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">Host</span>}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <StatusDot status={m.status} />
                                            <p className="text-[11px] text-gray-400 truncate">{m.class}</p>
                                        </div>
                                    </div>
                                    <button className="text-gray-300 hover:text-gray-500"><MoreVertical size={15} /></button>
                                </div>
                            ))}
                            {/* Add classmate */}
                            <button className="flex items-center gap-3 px-4 py-3 w-full hover:bg-gray-50 transition-colors">
                                <div className="w-9 h-9 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
                                    <Plus size={14} className="text-gray-300" />
                                </div>
                                <span className="text-sm text-gray-400 font-medium">Add a classmate</span>
                            </button>
                        </div>
                    </GroupSection>

                    {/* Invite a Teacher */}
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-4">
                        <p className="text-sm font-bold text-amber-800 mb-0.5">🎓 Invite a Teacher</p>
                        <p className="text-xs text-amber-600 mb-3">Stuck on a problem? Bring a teacher into the group to help your team.</p>

                        <div className="flex flex-col gap-2 mb-3">
                            {TEACHERS.map((t) => (
                                <div
                                    key={t.id}
                                    onClick={() => setInvitedTeacherId(invitedTeacherId === t.id ? null : t.id)}
                                    className={`flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 cursor-pointer border transition-all ${invitedTeacherId === t.id ? "border-[#4F61E8]" : "border-gray-100"
                                        }`}
                                >
                                    <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                                        {t.initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-700">{t.name}</p>
                                        <p className="text-xs text-gray-400">{t.subject}</p>
                                    </div>
                                    <TeacherStatusBadge status={t.status} />
                                    {/* Radio */}
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${invitedTeacherId === t.id ? "border-[#4F61E8] bg-[#4F61E8]" : "border-gray-200"
                                        }`}>
                                        {invitedTeacherId === t.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => setInviteOpen(true)} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                            <UserPlus size={15} /> Send Invitation to Teacher
                        </button>
                    </div>

                    {/* Problem Tracker */}
                    <GroupSection title="Problem Tracker" count={PROBLEMS.length}>
                        <div className="divide-y divide-gray-50">
                            {PROBLEMS.map((p) => (
                                <div key={p.id} className="flex items-start gap-3 px-4 py-3">
                                    <div className={`w-1 h-full min-h-[32px] rounded-full flex-shrink-0 mt-1 ${p.status === "Solved" ? "bg-green-400" : "bg-blue-400"}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-700 leading-snug">{p.title}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{p.postedBy} · {p.time}</p>
                                    </div>
                                    <ProblemBadge status={p.status} />
                                </div>
                            ))}
                            <button className="flex items-center gap-2 px-4 py-3 text-sm text-[#4F61E8] font-semibold hover:bg-gray-50 w-full transition-colors">
                                <Plus size={14} /> Post a new problem
                            </button>
                        </div>
                    </GroupSection>

                    {/* Shared Resources */}
                    <GroupSection title="Shared Resources" count={RESOURCES.length}>
                        <div className="divide-y divide-gray-50">
                            {RESOURCES.map((r) => (
                                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                                    <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                                        <ResourceIcon type={r.type} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-700 truncate">{r.name}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{r.uploadedBy} · {r.type.toUpperCase()} · {r.when}</p>
                                    </div>
                                    <span className="text-[10px] text-gray-400 flex-shrink-0">{r.size}</span>
                                </div>
                            ))}
                            <button className="flex items-center gap-2 px-4 py-3 text-sm text-[#4F61E8] font-semibold hover:bg-gray-50 w-full transition-colors">
                                <Plus size={14} /> Share a file or image
                            </button>
                        </div>
                    </GroupSection>

                    {/* Recent Activity */}
                    <GroupSection title="Recent Activity" defaultOpen={false}>
                        <div className="px-4 py-4 text-xs text-gray-400 text-center">No recent activity yet</div>
                    </GroupSection>

                    {/* Group Settings */}
                    <GroupSection title="Group Settings" defaultOpen={false}>
                        <div className="px-4 py-4 text-xs text-gray-400 text-center">Settings coming soon</div>
                    </GroupSection>

                    {/* Danger Zone */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
                        <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Danger Zone</p>
                        <div className="flex flex-col gap-2">
                            <button className="flex items-center justify-center gap-2 border border-gray-200 text-gray-500 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                                <Trash2 size={14} /> Clear Chat History
                            </button>
                            <button className="flex items-center justify-center gap-2 border border-red-200 text-red-400 text-sm font-semibold py-2.5 rounded-xl hover:bg-red-50 transition-colors">
                                <LogOut size={14} /> Leave Group
                            </button>
                        </div>
                    </div>

                    {/* Bottom actions */}
                    <div className="flex gap-2 pb-4">
                        <button className="flex-1 flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-600 font-semibold text-sm py-3 rounded-xl hover:bg-gray-50 transition-colors">
                            <UserPlus size={15} /> Invite Teacher
                        </button>
                        <Link to={`${groupId}`}
                            className="flex-1 flex items-center justify-center gap-2 bg-[#4F61E8] text-white font-semibold text-sm py-3 rounded-xl hover:bg-indigo-700 transition-colors"
                        >
                            <MessageSquare size={15} /> Open Group Chat
                        </Link>
                    </div>
                </div>
            </div>

            <InviteTeacherModal
                open={inviteOpen}
                onClose={() => setInviteOpen(false)}
                onSubmit={(data) => {
                    data
                     // { teacherId, question, subject }
                    // call your invite API here
                    setInviteOpen(false);
                }}
            />
        </>
    );
}

export default GroupDetailPanel