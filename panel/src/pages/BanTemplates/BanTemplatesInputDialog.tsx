import { useEffect, useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutosizeTextAreaRef, AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { BanTemplatesInputData } from "./BanTemplatesPage";
import { BanDurationType, BanTemplateSpacerType } from "@shared/otherTypes";
import { banDurationToString } from "@/lib/utils";
import { txToast } from "@/components/TxToaster";
import { PlusIcon, XIcon } from "lucide-react";

//Default dropdown options
const dropdownOptions = [
    '2 hours',
    '8 hours',
    '1 days',
    '2 days',
    '1 weeks',
    '2 weeks',
    'permanent'
];


type BanTemplatesInputDialogProps = {
    reasonData?: BanTemplatesInputData;
    onSave: (reasonData: BanTemplatesInputData) => void;
    isDialogOpen: boolean;
    setIsDialogOpen: (isOpen: boolean) => void;
}

export default function BanTemplatesInputDialog({
    reasonData,
    onSave,
    isDialogOpen,
    setIsDialogOpen
}: BanTemplatesInputDialogProps) {
    //Detecting initial state
    let initialReason = '';
    let initialSelectedDuration = '2 days';
    let initialCustomValue = undefined;
    let initialCustomUnits = 'days';
    let initialSpacers: BanTemplateSpacerType[] = [];
    if (reasonData) {
        initialReason = reasonData.reason;
        initialSpacers = reasonData.spacers || [];
        const isDefaultDuration = dropdownOptions.includes(banDurationToString(reasonData.duration));
        //technically don't need to check if permanent, but typescript is complaining
        if (isDefaultDuration || reasonData.duration === 'permanent') {
            initialSelectedDuration = banDurationToString(reasonData.duration);
        } else {
            initialSelectedDuration = 'custom';
            initialCustomValue = reasonData.duration.value;
            initialCustomUnits = reasonData.duration.unit;
        }
    }

    //Setting the states
    const reasonRef = useRef<AutosizeTextAreaRef>(null);
    const customMultiplierRef = useRef<HTMLInputElement>(null);
    const [selectedDuration, setSelectedDuration] = useState(initialSelectedDuration);
    const [customUnits, setCustomUnits] = useState(initialCustomUnits);
    const [spacers, setSpacers] = useState<BanTemplateSpacerType[]>(initialSpacers);

    // Helper functions for spacers management
    const addSpacer = () => {
        setSpacers(prev => [...prev, { name: '', placeholder: '' }]);
    };

    const removeSpacer = (index: number) => {
        setSpacers(prev => prev.filter((_, i) => i !== index));
    };

    const updateSpacer = (index: number, field: 'name' | 'placeholder', value: string) => {
        setSpacers(prev => prev.map((spacer, i) => 
            i === index ? { ...spacer, [field]: value } : spacer
        ));
    };

    const insertSpacerIntoReason = (spacerName: string) => {
        if (!reasonRef.current) return;
        const textarea = reasonRef.current.textArea;
        const placeholder = `{{${spacerName}}}`;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = textarea.value;
        const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
        textarea.value = newValue;
        // Set cursor position after the inserted placeholder
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
        textarea.focus();
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (isDialogOpen) return;
            setSelectedDuration(initialSelectedDuration);
            setCustomUnits(initialCustomUnits);
            setSpacers(initialSpacers);
            if (reasonRef.current) reasonRef.current.textArea.value = '';
            if (customMultiplierRef.current) customMultiplierRef.current.value = '';
        }, 500);
        return () => clearTimeout(timeout);
    }, [isDialogOpen]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const id = reasonData?.id || null;
        const reason = form.reason.value.trim();
        form.reason.value = reason; //just to make sure the field is also trimmed
        if (reason.length < 3) {
            form.reason.focus();
            return txToast.warning('Reason must be at least 3 characters long');
        }

        // Validate spacers
        const validSpacers = spacers.filter(spacer => spacer.name.trim() && spacer.placeholder.trim());
        const spacerNames = validSpacers.map(s => s.name.trim());
        const duplicateNames = spacerNames.filter((name, index) => spacerNames.indexOf(name) !== index);
        if (duplicateNames.length > 0) {
            return txToast.warning(`Duplicate spacer names: ${duplicateNames.join(', ')}`);
        }

        let duration: BanDurationType;
        if (selectedDuration === 'permanent') {
            duration = 'permanent';
        } else if (selectedDuration === 'custom') {
            if (form.durationMultiplier.value <= 0) {
                form.durationMultiplier.focus();
                return txToast.warning('Custom duration must be a positive number');
            }
            duration = {
                value: parseInt(form.durationMultiplier.value),
                unit: customUnits as 'hours' | 'days' | 'weeks' | 'months'
            };
        } else {
            const [value, unit] = selectedDuration.split(' ');
            duration = {
                value: parseInt(value),
                unit: unit as 'hours' | 'days' | 'weeks' | 'months'
            };
        }
        onSave({ id, reason, duration, spacers: validSpacers.length > 0 ? validSpacers : undefined });
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="md:max-w-xl">
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>{reasonData ? 'Edit' : 'Add'} Template</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-6 items-center gap-4">
                            <Label htmlFor="banReason" className="col-span-6 sm:col-auto">
                                Reason
                            </Label>
                            <AutosizeTextarea
                                id="reason"
                                placeholder="The reason for the ban, rule violated, etc."
                                className="col-span-full sm:col-span-5"
                                defaultValue={initialReason}
                                ref={reasonRef}
                                maxHeight={160}
                                minLength={3}
                                autoFocus
                                required
                                onChangeCapture={(e) => {
                                    //prevent breaking line
                                    const target = e.target as HTMLInputElement;
                                    if (target.value.includes('\n')) {
                                        target.value = target.value.replace(/\s*\r*\n+\s*/g, ' ');
                                    }
                                }}
                            />
                        </div>
                        
                        {/* Spacers Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">
                                    Replaceable Spacers (Optional)
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addSpacer}
                                    className="h-8"
                                >
                                    <PlusIcon className="size-4 mr-1" />
                                    Add Spacer
                                </Button>
                            </div>
                            
                            {spacers.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                    Spacers allow you to create placeholders like {`{{player_name}}`} in your ban reason that can be replaced with actual values when the template is used.
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                {spacers.map((spacer, index) => (
                                    <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                                        <Input
                                            placeholder="spacer_name"
                                            value={spacer.name}
                                            onChange={(e) => updateSpacer(index, 'name', e.target.value)}
                                            className="text-sm"
                                        />
                                        <Input
                                            placeholder="Default text"
                                            value={spacer.placeholder}
                                            onChange={(e) => updateSpacer(index, 'placeholder', e.target.value)}
                                            className="text-sm"
                                        />
                                        <div className="flex gap-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => insertSpacerIntoReason(spacer.name)}
                                                disabled={!spacer.name.trim()}
                                                className="h-8 px-2 text-xs"
                                            >
                                                Insert
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeSpacer(index)}
                                                className="h-8 px-2"
                                            >
                                                <XIcon className="size-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-6 items-center gap-4">
                            <Label htmlFor="durationSelect" className="col-span-6 sm:col-auto">
                                Duration
                            </Label>
                            <div className="col-span-full sm:col-span-5 space-y-1">
                                <Select
                                    onValueChange={setSelectedDuration}
                                    defaultValue={selectedDuration}
                                >
                                    <SelectTrigger id="durationSelect" className="tracking-wide">
                                        <SelectValue placeholder="Select Duration" />
                                    </SelectTrigger>
                                    <SelectContent className="tracking-wide">
                                        <SelectItem value="custom" className="font-bold">Custom (set below)</SelectItem>
                                        <SelectItem value="2 hours">2 HOURS</SelectItem>
                                        <SelectItem value="8 hours">8 HOURS</SelectItem>
                                        <SelectItem value="1 days">1 DAY</SelectItem>
                                        <SelectItem value="2 days">2 DAYS</SelectItem>
                                        <SelectItem value="1 weeks">1 WEEK</SelectItem>
                                        <SelectItem value="2 weeks">2 WEEKS</SelectItem>
                                        <SelectItem value="permanent" className="font-bold">Permanent</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="flex flex-row gap-2">
                                    <Input
                                        id="durationMultiplier"
                                        type="number"
                                        placeholder="123"
                                        defaultValue={initialCustomValue}
                                        disabled={selectedDuration !== 'custom'}
                                        ref={customMultiplierRef}
                                        min={1}
                                        max={99}
                                        required
                                    />
                                    <Select
                                        onValueChange={setCustomUnits}
                                        defaultValue={customUnits}
                                    >
                                        <SelectTrigger
                                            id="durationUnits"
                                            className="tracking-wide"
                                            disabled={selectedDuration !== 'custom'}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="tracking-wide">
                                            <SelectItem value="hours">HOURS</SelectItem>
                                            <SelectItem value="days">DAYS</SelectItem>
                                            <SelectItem value="weeks">WEEKS</SelectItem>
                                            <SelectItem value="months">MONTHS</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Save changes</Button>
                        </DialogFooter>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
