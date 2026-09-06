import {
    Button,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    PopoverClose,
    ColorPicker,
    ColorPickerAlpha,
    ColorPickerFormat,
    ColorPickerHue,
    ColorPickerOutput,
    ColorPickerSelection,
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@bluethub/ui-kit";

import PaintIcon from "@/assets/svg/paint.svg?react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { onSetAction, onSetFillColor } from "@/store/class-action-slice";
import type { RootState } from "@/store";
import { X, Pipette } from "lucide-react";

// ── Preset palette — curated for whiteboard use ──────────────
const PRESETS = [
    // Row 1 — core colours
    "#000000", "#ffffff", "#ef4444", "#f97316",
    "#eab308", "#22c55e", "#3b82f6", "#8b5cf6",
    // Row 2 — softer tones
    "#fca5a5", "#fdba74", "#fde68a", "#86efac",
    "#93c5fd", "#c4b5fd", "#f9a8d4", "#94a3b8",
];

// ── Stroke width presets ─────────────────────────────────────
const SIZES = [2, 4, 8, 14, 22];

const Paint = () => {
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [strokeSize, setStrokeSize] = useState<number>(4);
    const [recentColors, setRecentColors] = useState<string[]>([]);

    const dispatch = useDispatch();
    const actionSelect = useSelector((state: RootState) => state.action.value);

    useEffect(() => {
        if (selectedPreset !== null) {
            dispatch(onSetFillColor(selectedPreset));
            // Push to recent (deduplicated, max 6)
            setRecentColors(prev => {
                const filtered = prev.filter(c => c !== selectedPreset);
                return [selectedPreset, ...filtered].slice(0, 6);
            });
        }
    }, [selectedPreset, dispatch]);

    const isActive = actionSelect === "paint";

    return (
        <div className={`
            font-poppins flex items-center justify-center py-2 cursor-pointer
            transition-colors rounded-lg
            ${isActive ? "bg-forestBlue" : "hover:bg-forestBlue/40"}
        `}>
            <Popover>
                <PopoverTrigger asChild>
                    <div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="bg-transparent hover:bg-transparent cursor-pointer p-2"
                                    onClick={() => dispatch(onSetAction("paint"))}
                                >
                                    <PaintIcon className="size-5 text-forestBlue-light" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" align="center">
                                <p>Paint brush</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </PopoverTrigger>

                <PopoverContent
                    side="right"
                    sideOffset={12}
                    className="p-0 overflow-y-scroll ml-2 w-[276px] h-[500px] font-poppins border border-white/10 rounded-2xl bg-[#111118] shadow-2xl shadow-black/60 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]  ">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-violet-400 to-pink-400" />
                            <span className="text-[13px] font-semibold text-white/80 tracking-wide">
                                Brush & Color
                            </span>
                        </div>
                        <PopoverClose asChild>
                            <button className="w-6 h-6 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors">
                                <X size={13} />
                            </button>
                        </PopoverClose>
                    </div>

                    <div className="p-3 space-y-4">

                        {/* ── Color picker canvas ── */}
                        <ColorPicker className="space-y-2.5">
                            <ColorPickerSelection className="w-full h-36 rounded-xl overflow-hidden" />

                            {/* Hue + Alpha sliders */}
                            <div className="flex items-center gap-2.5">
                                <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors shrink-0">
                                    <Pipette size={13} />
                                </button>
                                <div className="flex-1 space-y-2">
                                    <ColorPickerHue className="h-3 rounded-full" />
                                    <ColorPickerAlpha className="h-3 rounded-full" />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Format selector */}
                                <div className="relative [&_select]:bg-[#1c1c26] [&_select]:border-white/10 [&_select]:text-white/60 [&_select]:text-[11px] [&_select]:rounded-lg [&_select]:h-8 [&_select]:px-2 [&_select]:outline-none">
                                    <ColorPickerFormat setSelectedPreset={setSelectedPreset} />
                                </div>

                                {/* Output input */}
                                <div className="flex-1 [&_input]:!bg-white [&_input]:!border-white/10 [&_input]:!text-white/80 [&_input]:!text-[12px] [&_input]:!font-mono [&_*]:!bg-white">
                                    <ColorPickerOutput  />
                                </div>
                            </div>
                        </ColorPicker>

                        {/* ── Divider ── */}
                        <div className="h-px bg-white/[0.07]" />

                        {/* ── Preset palette ── */}
                        <div>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                                Palette
                            </p>
                            <div className="grid grid-cols-8 gap-1.5">
                                {PRESETS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setSelectedPreset(color)}
                                        title={color}
                                        className={`
                                            w-7 h-7 rounded-lg transition-all border-2 hover:scale-110
                                            ${selectedPreset === color
                                                ? "border-white/80 scale-110 shadow-md"
                                                : "border-transparent hover:border-white/30"
                                            }
                                            ${color === "#ffffff" ? "border-white/20" : ""}
                                        `}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* ── Recent colors (if any) ── */}
                        {recentColors.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                                    Recent
                                </p>
                                <div className="flex gap-1.5">
                                    {recentColors.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedPreset(color)}
                                            className="w-7 h-7 rounded-lg border-2 border-transparent hover:border-white/30 hover:scale-110 transition-all"
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Divider ── */}
                        <div className="h-px bg-white/[0.07]" />

                        {/* ── Stroke width ── */}
                        <div>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2.5">
                                Stroke Width
                            </p>
                            <div className="flex items-center gap-2">
                                {SIZES.map(size => (
                                    <button
                                        key={size}
                                        onClick={() => setStrokeSize(size)}
                                        title={`${size}px`}
                                        className={`
                                            flex-1 flex items-center justify-center h-8 rounded-lg transition-all border
                                            ${strokeSize === size
                                                ? "bg-white/15 border-white/30"
                                                : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10"
                                            }
                                        `}
                                    >
                                        <span
                                            className="rounded-full bg-white/70"
                                            style={{
                                                width: Math.max(4, size * 0.8),
                                                height: Math.max(2, size * 0.5),
                                                maxWidth: 18,
                                                maxHeight: 12,
                                            }}
                                        />
                                    </button>
                                ))}
                            </div>
                            {/* Size label */}
                            <p className="text-[10px] text-white/25 mt-1.5 text-center">
                                {strokeSize}px
                            </p>
                        </div>

                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default Paint;