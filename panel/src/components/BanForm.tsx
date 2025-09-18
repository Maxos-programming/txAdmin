import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClosePlayerModal } from "@/hooks/playerModal";
import { ClipboardPasteIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { DropDownSelect, DropDownSelectContent, DropDownSelectItem, DropDownSelectTrigger } from "@/components/dropDownSelect";
import { banDurationToShortString, banDurationToString, cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import type { BanTemplatesDataType } from "@shared/otherTypes";
import { replaceBanReasonSpacers } from "@shared/otherTypes";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Consts
const reasonTruncateLength = 150;
const ADD_NEW_SELECT_OPTION = '!add-new';
const defaultDurations = ['permanent', '2 hours', '8 hours', '1 day', '2 days', '1 week', '2 weeks'];

// Types
type BanFormRespType = {
    reason: string;
    duration: string;
}
export type BanFormType = HTMLDivElement & {
    focusReason: () => void;
    clearData: () => void;
    getData: () => BanFormRespType;
}
type BanFormProps = {
    banTemplates?: BanTemplatesDataType[]; //undefined = loading
    disabled?: boolean;
    onNavigateAway?: () => void;
};

/**
 * A form to set ban reason and duration.
 */
export default forwardRef(function BanForm({ banTemplates, disabled, onNavigateAway }: BanFormProps, ref) {
    const reasonRef = useRef<HTMLInputElement>(null);
    const customMultiplierRef = useRef<HTMLInputElement>(null);
    const setLocation = useLocation()[1];
    const [currentDuration, setCurrentDuration] = useState('2 days');
    const [customUnits, setCustomUnits] = useState('days');
    const closeModal = useClosePlayerModal();
    const [spacerDialogOpen, setSpacerDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<BanTemplatesDataType | null>(null);
    const [spacerValues, setSpacerValues] = useState<Record<string, string>>({});

    //Exposing methods to the parent
    useImperativeHandle(ref, () => {
        return {
            getData: () => {
                return {
                    reason: reasonRef.current?.value.trim(),
                    duration: currentDuration === 'custom'
                        ? `${customMultiplierRef.current?.value} ${customUnits}`
                        : currentDuration,
                };
            },
            clearData: () => {
                if (!reasonRef.current || !customMultiplierRef.current) return;
                reasonRef.current.value = '';
                customMultiplierRef.current.value = '';
                setCurrentDuration('2 days');
                setCustomUnits('days');
            },
            focusReason: () => {
                reasonRef.current?.focus();
            }
        };
    }, [reasonRef, customMultiplierRef, currentDuration, customUnits]);

    const handleTemplateSelectChange = (value: string) => {
        if (value === ADD_NEW_SELECT_OPTION) {
            setLocation('/settings/ban-templates');
            onNavigateAway?.();
        } else {
            if (!banTemplates) return;
            const template = banTemplates.find(template => template.id === value);
            if (!template) return;

            // Check if template has spacers that need values
            if (template.spacers && template.spacers.length > 0) {
                setSelectedTemplate(template);
                // Initialize spacer values with placeholders
                const initialValues: Record<string, string> = {};
                for (const spacer of template.spacers) {
                    initialValues[spacer.name] = '';
                }
                setSpacerValues(initialValues);
                setSpacerDialogOpen(true);
                return;
            }

            // Apply template directly if no spacers
            applyTemplate(template, {});
        }
    }

    const applyTemplate = (template: BanTemplatesDataType, values: Record<string, string>) => {
        const processedDuration = banDurationToString(template.duration);
        if (defaultDurations.includes(processedDuration)) {
            setCurrentDuration(processedDuration);
        } else if (typeof template.duration === 'object') {
            setCurrentDuration('custom');
            customMultiplierRef.current!.value = template.duration.value.toString();
            setCustomUnits(template.duration.unit);
        }

        const processedReason = template.spacers && template.spacers.length > 0 
            ? replaceBanReasonSpacers(template.reason, template.spacers, values)
            : template.reason;
        
        reasonRef.current!.value = processedReason;
        setTimeout(() => {
            reasonRef.current!.focus();
        }, 50);
    };

    const handleSpacerDialogConfirm = () => {
        if (selectedTemplate) {
            applyTemplate(selectedTemplate, spacerValues);
        }
        setSpacerDialogOpen(false);
        setSelectedTemplate(null);
        setSpacerValues({});
    };

    //Ban templates render optimization
    const processedTemplates = useMemo(() => {
        if (!banTemplates) return;
        return banTemplates.map((template, index) => {
            const duration = banDurationToShortString(template.duration);
            const reason = template.reason.length > reasonTruncateLength
                ? template.reason.slice(0, reasonTruncateLength - 3) + '...'
                : template.reason;
            const hasSpacers = template.spacers && template.spacers.length > 0;
            return (
                <DropDownSelectItem
                    key={index}
                    value={template.id}
                    className="focus:bg-secondary focus:text-secondary-foreground"
                >
                    <div className="flex items-center gap-2 w-full">
                        <span
                            className="inline-block pr-1 font-mono opacity-75 min-w-[4ch]"
                        >{duration}</span>
                        <span className="flex-1">{reason}</span>
                        {hasSpacers && (
                            <span className="text-xs opacity-60 bg-secondary px-1 rounded">
                                {template.spacers.length} spacer{template.spacers.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </DropDownSelectItem>
            );
        });
    }, [banTemplates]);

    // Simplifying the jsx below
    let banTemplatesContentNode: React.ReactNode;
    if (!Array.isArray(banTemplates)) {
        banTemplatesContentNode = (
            <div className="text-secondary-foreground text-center p-4">
                <Loader2Icon className="inline animate-spin size-6" />
            </div>
        );
    } else {
        if (!banTemplates.length) {
            banTemplatesContentNode = (
                <div className="text-warning-inline text-center p-4">
                    You do not have any template configured. <br />
                    <Link
                        href="/settings/ban-templates"
                        className="cursor-pointer underline hover:text-accent"
                        onClick={() => { closeModal(); }}
                    >
                        Add Ban Template
                        <ExternalLinkIcon className="inline mr-1 h-4" />
                    </Link>
                </div>
            );
        } else {
            banTemplatesContentNode = <>
                {processedTemplates}
                <DropDownSelectItem
                    value={ADD_NEW_SELECT_OPTION}
                    className="font-bold text-warning-inline"
                >
                    Add Ban Template
                    <ExternalLinkIcon className="inline mr-1 h-4" />
                </DropDownSelectItem>
            </>;
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
                <Label htmlFor="banReason">
                    Reason
                </Label>
                <div className="flex gap-1">
                    <Input
                        id="banReason"
                        ref={reasonRef}
                        placeholder="The reason for the ban, rule violated, etc."
                        className="w-full"
                        disabled={disabled}
                        autoFocus
                    />
                    <DropDownSelect onValueChange={handleTemplateSelectChange} disabled={disabled}>
                        <DropDownSelectTrigger className="tracking-wide">
                            <button
                                className={cn(
                                    'size-10 inline-flex justify-center items-center rounded-md shrink-0',
                                    'ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                    'border bg-black/20 shadow-sm',
                                    'hover:bg-primary hover:text-primary-foreground hover:border-primary',
                                    'disabled:opacity-50 disabled:cursor-not-allowed',
                                )}
                            >
                                <ClipboardPasteIcon className="size-5" />
                            </button>
                        </DropDownSelectTrigger>
                        <DropDownSelectContent className="tracking-wide w-[calc(100vw-1rem)] sm:max-w-screen-sm" align="end">
                            {banTemplatesContentNode}
                        </DropDownSelectContent>
                    </DropDownSelect>
                </div>
            </div>
            <div className="flex flex-col gap-3">
                <Label htmlFor="durationSelect">
                    Duration
                </Label>
                <div className="space-y-1">
                    <Select
                        onValueChange={setCurrentDuration}
                        value={currentDuration}
                        disabled={disabled}
                    >
                        <SelectTrigger id="durationSelect" className="tracking-wide">
                            <SelectValue placeholder="Select Duration" />
                        </SelectTrigger>
                        <SelectContent className="tracking-wide">
                            <SelectItem value="custom" className="font-bold">Custom (set below)</SelectItem>
                            <SelectItem value="2 hours">2 HOURS</SelectItem>
                            <SelectItem value="8 hours">8 HOURS</SelectItem>
                            <SelectItem value="1 day">1 DAY</SelectItem>
                            <SelectItem value="2 days">2 DAYS</SelectItem>
                            <SelectItem value="1 week">1 WEEK</SelectItem>
                            <SelectItem value="2 weeks">2 WEEKS</SelectItem>
                            <SelectItem value="permanent" className="font-bold">Permanent</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex flex-row gap-2">
                        <Input
                            id="durationMultiplier"
                            type="number"
                            placeholder="123"
                            required
                            disabled={currentDuration !== 'custom' || disabled}
                            ref={customMultiplierRef}
                        />
                        <Select
                            onValueChange={setCustomUnits}
                            value={customUnits}
                        >
                            <SelectTrigger
                                className="tracking-wide"
                                id="durationUnits"
                                disabled={currentDuration !== 'custom' || disabled}
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
            
            {/* Spacer Values Dialog */}
            <Dialog open={spacerDialogOpen} onOpenChange={setSpacerDialogOpen}>
                <DialogContent className="md:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Fill Template Values</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            This template uses placeholders that will be replaced with actual values. Fill them out below or leave empty to use defaults:
                        </p>
                        <div className="bg-muted/50 p-3 rounded-md text-sm">
                            <strong>Preview:</strong> {selectedTemplate ? replaceBanReasonSpacers(
                                selectedTemplate.reason, 
                                selectedTemplate.spacers || [], 
                                spacerValues
                            ) : ''}
                        </div>
                        {selectedTemplate?.spacers?.map((spacer, index) => (
                            <div key={index} className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor={`spacer-${index}`} className="text-right font-mono text-sm">
                                    {`{{${spacer.name}}}`}
                                </Label>
                                <Input
                                    id={`spacer-${index}`}
                                    className="col-span-3"
                                    placeholder={spacer.placeholder}
                                    value={spacerValues[spacer.name] || ''}
                                    onChange={(e) => setSpacerValues(prev => ({
                                        ...prev,
                                        [spacer.name]: e.target.value
                                    }))}
                                />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSpacerDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSpacerDialogConfirm}>
                            Apply Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
});
