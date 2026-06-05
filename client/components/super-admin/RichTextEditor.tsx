import React, { useRef, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Type,
  Palette,
  Highlighter,
  RemoveFormatting,
  Variable,
  Save,
  ClipboardCopy,
  Check,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const PLACEHOLDER_VARIABLES = [
  { label: "Client Name", token: "{{CONSUMER_FULL_NAME}}" },
  { label: "Client Address", token: "{{CONSUMER_ADDRESS}}" },
  { label: "City, State ZIP", token: "{{CONSUMER_CITY_STATE_ZIP}}" },
  { label: "Date of Birth", token: "{{CONSUMER_DOB}}" },
  { label: "SSN (Last 4)", token: "{{CONSUMER_SSN_LAST4}}" },
  { label: "Today's Date", token: "{{TODAY_DATE}}" },
  { label: "Bureau Name", token: "{{BUREAU_NAME}}" },
  { label: "Personal Info Bureau ID", token: "{{PERSONAL_INFO_BUREAU_ID}}" },
  { label: "Personal Info Bureau Name", token: "{{PERSONAL_INFO_BUREAU_NAME}}" },
  { label: "Personal Info First Name", token: "{{PERSONAL_INFO_FIRST_NAME}}" },
  { label: "Personal Info Middle Name", token: "{{PERSONAL_INFO_MIDDLE_NAME}}" },
  { label: "Personal Info Last Name", token: "{{PERSONAL_INFO_LAST_NAME}}" },
  { label: "Personal Info Full Name", token: "{{PERSONAL_INFO_FULL_NAME}}" },
  { label: "Personal Info Name Type", token: "{{PERSONAL_INFO_NAME_TYPE}}" },
  { label: "Personal Info Street Address", token: "{{PERSONAL_INFO_STREET_ADDRESS}}" },
  { label: "Personal Info City", token: "{{PERSONAL_INFO_CITY}}" },
  { label: "Personal Info State", token: "{{PERSONAL_INFO_STATE}}" },
  { label: "Personal Info ZIP", token: "{{PERSONAL_INFO_ZIP}}" },
  { label: "Personal Info Full Address", token: "{{PERSONAL_INFO_FULL_ADDRESS}}" },
  { label: "Personal Info Address Type", token: "{{PERSONAL_INFO_ADDRESS_TYPE}}" },
  { label: "Personal Info DOB", token: "{{PERSONAL_INFO_DOB}}" },
  { label: "Personal Info Score", token: "{{PERSONAL_INFO_SCORE}}" },
  { label: "Personal Info Score Type", token: "{{PERSONAL_INFO_SCORE_TYPE}}" },
  { label: "Personal Info Date Score", token: "{{PERSONAL_INFO_DATE_SCORE}}" },
  { label: "Personal Info Employer Name", token: "{{PERSONAL_INFO_EMPLOYER_NAME}}" },
  { label: "Personal Info Employer Date Updated", token: "{{PERSONAL_INFO_EMPLOYER_DATE_UPDATED}}" },
  { label: "Personal Info Employer Date Reported", token: "{{PERSONAL_INFO_EMPLOYER_DATE_REPORTED}}" },
  { label: "Bankruptcy Type", token: "{{BANKRUPTCY_TYPE}}" },
  { label: "Bankruptcy Classification", token: "{{BANKRUPTCY_CLASSIFICATION}}" },
  { label: "Bankruptcy Amount", token: "{{BANKRUPTCY_AMOUNT}}" },
  { label: "Bankruptcy Date", token: "{{BANKRUPTCY_DATE}}" },
  { label: "Bankruptcy Date Filed", token: "{{BANKRUPTCY_DATE_FILED}}" },
  { label: "Bankruptcy Date Reported", token: "{{BANKRUPTCY_DATE_REPORTED}}" },
  { label: "Bankruptcy Status", token: "{{BANKRUPTCY_STATUS}}" },
  { label: "Bankruptcy Industry", token: "{{BANKRUPTCY_INDUSTRY}}" },
  { label: "Bankruptcy Account Designator", token: "{{BANKRUPTCY_ACCOUNT_DESIGNATOR}}" },
  { label: "Bankruptcy Reference Number", token: "{{BANKRUPTCY_REFERENCE_NUMBER}}" },
  { label: "Bankruptcy Closing Date", token: "{{BANKRUPTCY_CLOSING_DATE}}" },
  { label: "Bankruptcy Court", token: "{{BANKRUPTCY_COURT}}" },
  { label: "Bankruptcy Asset Amount", token: "{{BANKRUPTCY_ASSET_AMOUNT}}" },
  { label: "Bankruptcy Liability", token: "{{BANKRUPTCY_LIABILITY}}" },
  { label: "Bankruptcy Exempt Amount", token: "{{BANKRUPTCY_EXEMPT_AMOUNT}}" },
  { label: "Bankruptcy Remarks", token: "{{BANKRUPTCY_REMARKS}}" },
  { label: "Bankruptcy Name", token: "{{BANKRUPTCY_NAME}}" },
  { label: "Bankruptcy Case Number", token: "{{BANKRUPTCY_CASE_NUMBER}}" },
  { label: "Creditor Name", token: "{{CREDITOR_NAME}}" },
  { label: "Else Bureau + Custom Text + Creditor Name", token: "{{ELSE_BUREAU()MISS_MATCH_CREDITOR_NAME}}" },
  { label: "Else Bureau + Personal Info Name", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_NAME}}" },
  { label: "Else Bureau + Personal Info First Name", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_FIRST_NAME}}" },
  { label: "Else Bureau + Personal Info Middle Name", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_MIDDLE_NAME}}" },
  { label: "Else Bureau + Personal Info Last Name", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_LAST_NAME}}" },
  { label: "Else Bureau + Personal Info Address", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_ADDRESS}}" },
  { label: "Else Bureau + Personal Info Street Address", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_STREET_ADDRESS}}" },
  { label: "Else Bureau + Personal Info City", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_CITY}}" },
  { label: "Else Bureau + Personal Info State", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_STATE}}" },
  { label: "Else Bureau + Personal Info ZIP", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_ZIP}}" },
  { label: "Else Bureau + Personal Info Address Type", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_ADDRESS_TYPE}}" },
  { label: "Else Bureau + Personal Info DOB", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_DOB}}" },
  { label: "Else Bureau + Personal Info Employer Name", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_EMPLOYER_NAME}}" },
  { label: "Else Bureau + Personal Info Employer Date Updated", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_EMPLOYER_DATE_UPDATED}}" },
  { label: "Else Bureau + Personal Info Employer Date Reported", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_EMPLOYER_DATE_REPORTED}}" },
  { label: "Else Bureau + Personal Info Score", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_SCORE}}" },
  { label: "Else Bureau + Personal Info Score Type", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_SCORE_TYPE}}" },
  { label: "Else Bureau + Personal Info Date Score", token: "{{ELSE_BUREAU_MISS_MATCH_PERSONAL_INFO_DATE_SCORE}}" },
  { label: "Else Bureau + Bankruptcy Type", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_TYPE}}" },
  { label: "Else Bureau + Bankruptcy Classification", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_CLASSIFICATION}}" },
  { label: "Else Bureau + Bankruptcy Amount", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_AMOUNT}}" },
  { label: "Else Bureau + Bankruptcy Date", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_DATE}}" },
  { label: "Else Bureau + Bankruptcy Date Filed", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_DATE_FILED}}" },
  { label: "Else Bureau + Bankruptcy Date Reported", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_DATE_REPORTED}}" },
  { label: "Else Bureau + Bankruptcy Status", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_STATUS}}" },
  { label: "Else Bureau + Bankruptcy Industry", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_INDUSTRY}}" },
  { label: "Else Bureau + Bankruptcy Account Designator", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_ACCOUNT_DESIGNATOR}}" },
  { label: "Else Bureau + Bankruptcy Reference Number", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_REFERENCE_NUMBER}}" },
  { label: "Else Bureau + Bankruptcy Closing Date", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_CLOSING_DATE}}" },
  { label: "Else Bureau + Bankruptcy Court", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_COURT}}" },
  { label: "Else Bureau + Bankruptcy Asset Amount", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_ASSET_AMOUNT}}" },
  { label: "Else Bureau + Bankruptcy Liability", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_LIABILITY}}" },
  { label: "Else Bureau + Bankruptcy Exempt Amount", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_EXEMPT_AMOUNT}}" },
  { label: "Else Bureau + Bankruptcy Remarks", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_REMARKS}}" },
  { label: "Else Bureau + Bankruptcy Name", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_NAME}}" },
  { label: "Else Bureau + Bankruptcy Case Number", token: "{{ELSE_BUREAU_MISS_MATCH_BANKRUPTCY_CASE_NUMBER}}" },
  { label: "Else Bureau + Account Number", token: "{{ELSE_BUREAU_MISS_MATCH_ACCOUNT_NUMBER}}" },
  { label: "Else Bureau + Date Opened", token: "{{ELSE_BUREAU_MISS_MATCH_DATE_OPENED}}" },
  { label: "Else Bureau + Date of First Delinquency", token: "{{ELSE_BUREAU_MISS_MATCH_Date of First Delinquency}}" },
  { label: "Else Bureau + Current Balance", token: "{{ELSE_BUREAU_MISS_MATCH_Current Balance}}" },
  { label: "Else Bureau + Payment History", token: "{{ELSE_BUREAU_MISS_MATCH_Payment History}}" },
  { label: "Else Bureau + Account Status", token: "{{ELSE_BUREAU_MISS_MATCH_Account Status}}" },
  { label: "Else Bureau + Date of Last Payment", token: "{{ELSE_BUREAU_MISS_MATCH_Date of Last Payment}}" },
  { label: "Else Bureau + Account Ownership / Assignment", token: "{{ELSE_BUREAU_MISS_MATCH_Account Ownership / Assignment}}" },
  { label: "Else Bureau + Account Monthly Payment Amount", token: "{{ELSE_BUREAU_MISS_MATCH_Account Monthly Payment Amount}}" },
  { label: "Else Bureau + Account Credit Limit / High Credit", token: "{{ELSE_BUREAU_MISS_MATCH_Account Credit Limit / High Credit}}" },
  { label: "Else Bureau + Original Balance / Loan Amount", token: "{{ELSE_BUREAU_MISS_MATCH_Original Balance / Loan Amount}}" },
  { label: "Else Bureau + Terms / Duration of Loan", token: "{{ELSE_BUREAU_MISS_MATCH_Terms / Duration of Loan}}" },
  { label: "Else Bureau + Payment Rating", token: "{{ELSE_BUREAU_MISS_MATCH_Payment Rating}}" },
  { label: "Else Bureau + Account Type / Portfolio Type", token: "{{ELSE_BUREAU_MISS_MATCH_Account Type / Portfolio Type}}" },
  { label: "Else Bureau + Responsibility (ECOA) Code", token: "{{ELSE_BUREAU_MISS_MATCH_Responsibility (ECOA) Code}}" },
  { label: "Else Bureau + Compliance Condition Code", token: "{{ELSE_BUREAU_MISS_MATCH_Compliance Condition Code}}" },
  { label: "Else Bureau + Special Comment Code", token: "{{ELSE_BUREAU_MISS_MATCH_Special Comment Code}}" },
  { label: "Account Number", token: "{{ACCOUNT_NUMBER_MASKED}}" },
  { label: "Negative Item Type", token: "{{NEGATIVE_ITEM_TYPE}}" },
  { label: "Account/Inquiry Type", token: "{{ACCOUNT_OR_INQUIRY_TYPE}}" },
  { label: "Negative Item Date", token: "{{NEGATIVE_ITEM_DATE}}" },
  { label: "Amount", token: "{{AMOUNT}}" },
  { label: "Dispute Reason", token: "{{SPECIFIC_DISPUTE_REASON}}" },
  { label: "Tradeline List", token: "{{TRADLINE_LIST}}" },
  { label: "Creditor List", token: "{{CREDITOR_LIST}}" },
  { label: "Creditor List (Numbered)", token: "{{CREDITOR_LIST_WISE}}" },
  { label: "Creditor One (Custom Before/After)", token: "(){{CREDITOR_ONE}}()" },
  { label: "Creditor Two (Custom Before/After)", token: "(){{CREDITOR_TWO}}()" },
  { label: "Creditor Three (Custom Before/After)", token: "(){{CREDITOR_THREE}}()" },
  { label: "Creditor Four (Custom Before/After)", token: "(){{CREDITOR_FOUR}}()" },
  { label: "Creditor Five (Custom Before/After)", token: "(){{CREDITOR_FIVE}}()" },
  { label: "Account Number List", token: "{{ACCOUNT_NUMBER_LIST}}" },
  { label: "Account Number (Numbered)", token: "{{ACCOUNT_NUMBER_LIST_WISE}}" },
  { label: "Date Opened", token: "{{DATE_OPENED}}" },
  { label: "Date of First Delinquency", token: "{{DATE_OF_FIRST_DELINQUENCY}}" },
  { label: "Account Status", token: "{{ACCOUNT_STATUS}}" },
  { label: "Current Balance", token: "{{CURRENT_BALANCE}}" },
  { label: "Original Loan Amount", token: "{{ORIGINAL_LOAN_AMOUNT}}" },
  { label: "Date of Last Payment", token: "{{DATE_OF_LAST_PAYMENT}}" },
  { label: "Date of Last Activity", token: "{{DATE_OF_LAST_ACTIVITY}}" },
  { label: "Account Type", token: "{{ACCOUNT_TYPE}}" },
  { label: "Account Responsibility", token: "{{ACCOUNT_RESPONSIBILITY}}" },
  { label: "Account Status Date", token: "{{ACCOUNT_STATUS_DATE}}" },
  { label: "Account Terms", token: "{{ACCOUNT_TERMS}}" },
  { label: "Scheduled Payment Amount", token: "{{SCHEDULED_PAYMENT_AMOUNT}}" },
  { label: "Date Closed", token: "{{DATE_CLOSED}}" },
  { label: "High Balance", token: "{{HIGH_BALANCE}}" },
  { label: "Payment Status", token: "{{PAYMENT_STATUS}}" },
];

export function buildLetterEditorAiGuide(): string {
  const variablesList = PLACEHOLDER_VARIABLES.map(
    (pv) => `  ${pv.token}  ->  ${pv.label}`
  ).join("\n");

  return `=== CREDIT REPAIR LETTER EDITOR - AI REFERENCE GUIDE ===

IMPORTANT: Output ONLY raw HTML code. I will paste your response directly
into the editor's Code mode. Do NOT include markdown fences, explanations,
or any text outside the HTML.

-------------------------------------
1. AVAILABLE PLACEHOLDER VARIABLES
-------------------------------------
Use these tokens exactly as shown (double curly braces). They will be
replaced with real client/dispute data when the letter is generated.

${variablesList}

-------------------------------------
2. SUPPORTED HTML FORMATTING
-------------------------------------
The editor accepts standard HTML. Use these tags and inline styles
freely - they will all render in the final PDF:

  HEADINGS
    <h1>...</h1>  through  <h6>...</h6>

  TEXT FORMATTING
    <b>...</b> or <strong>...</strong>          Bold
    <i>...</i> or <em>...</em>                  Italic
    <u>...</u>                                 Underline
    <s>...</s> or <strike>...</strike>          Strikethrough

  PARAGRAPHS & LINE BREAKS
    <p>...</p>                                 Paragraph
    <br> or <br />                             Line break

  LISTS
    <ul><li>...</li></ul>                      Bullet list
    <ol><li>...</li></ol>                      Numbered list

  ALIGNMENT (via inline style)
    style="text-align: left"
    style="text-align: center"
    style="text-align: right"

  FONT SIZE
    <span style="font-size: 18px">...</span>
    Any valid CSS size works, for example 12px, 16px, 24px, 32px

  TEXT COLOR
    <span style="color: #dc2626">...</span>
    Available palette: #000000, #333333, #666666, #999999,
      #dc2626, #ea580c, #ca8a04, #16a34a, #2563eb, #7c3aed,
      #db2777, #0d9488  (any valid CSS color works)

  HIGHLIGHT / BACKGROUND COLOR
    <span style="background-color: #fef08a">...</span>
    Available palette: #fef08a, #bbf7d0, #bfdbfe, #e9d5ff,
      #fecdd3, #fed7aa, #d1d5db  (any valid CSS color works)

  COMBINED EXAMPLE
    <span style="color: #dc2626; background-color: #fef08a; font-weight: bold">...</span>

-------------------------------------
3. FULL EXAMPLE TEMPLATE
-------------------------------------
<p>To Whom It May Concern,</p>

<p>I am writing to formally dispute the following items on my
<b>{{BUREAU_NAME}}</b> credit report:</p>

<h4>Disputed Items</h4>
<p>{{CREDITOR_LIST}}</p>

<p style="text-align: left;">Under the <b>Fair Credit Reporting Act
(FCRA), Section 611</b>, I am requesting that you
<span style="color: #dc2626">investigate and verify</span>
the accuracy of the above items within <u>30 days</u>.</p>

<p>Sincerely,</p>
<p><b>{{CONSUMER_FULL_NAME}}</b><br>
{{CONSUMER_ADDRESS}}<br>
{{CONSUMER_CITY_STATE_ZIP}}</p>

-------------------------------------
REMINDER: Return ONLY the HTML. No markdown. No explanation.
`;
}

const FONT_COLORS = [
  "#000000", "#333333", "#666666", "#999999",
  "#dc2626", "#ea580c", "#ca8a04", "#16a34a",
  "#2563eb", "#7c3aed", "#db2777", "#0d9488",
];

const HIGHLIGHT_COLORS = [
  "transparent", "#fef08a", "#bbf7d0", "#bfdbfe",
  "#e9d5ff", "#fecdd3", "#fed7aa", "#d1d5db",
];

const CUSTOM_FONT_SIZE_OPTION = "__custom_font_size__";
const FONT_SIZE_OPTIONS = [
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "28px", value: "28px" },
  { label: "32px", value: "32px" },
] as const;

function normalizeVariableHtml(html: string): string {
  if (!html || typeof document === "undefined") return html;

  const temp = document.createElement("div");
  temp.innerHTML = html;
  temp.querySelectorAll("[data-placeholder]").forEach((el) => {
    const token = el.getAttribute("data-placeholder") || el.textContent || "";
    el.replaceWith(document.createTextNode(token));
  });
  return temp.innerHTML;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  onSave?: () => void;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start typing...",
  minHeight = "180px",
  onSave,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const sourceEditorRef = useRef<HTMLTextAreaElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [headingValue, setHeadingValue] = useState("p");
  const [fontSizeValue, setFontSizeValue] = useState("");
  const [customFontSize, setCustomFontSize] = useState("16");
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [variableSearch, setVariableSearch] = useState("");
  const [customHighlightColor, setCustomHighlightColor] = useState("#fef08a");
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceValue, setSourceValue] = useState("");
  const [sourceEditorHeight, setSourceEditorHeight] = useState("");
  const [copied, setCopied] = useState(false);
  const isInternalChange = useRef(false);

  useEffect(() => {
    const normalizedValue = normalizeVariableHtml(value || "");
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    if (sourceMode) {
      setSourceValue((prev) => (prev === normalizedValue ? prev : normalizedValue));
      return;
    }

    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== normalizedValue) {
      editorRef.current.innerHTML = normalizedValue;
    }
  }, [sourceMode, value]);

  const syncContent = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    onChange(normalizeVariableHtml(editorRef.current.innerHTML));
  }, [onChange]);

  const syncSourceContent = useCallback(
    (nextValue: string) => {
      isInternalChange.current = true;
      setSourceValue(nextValue);
      onChange(nextValue);
    },
    [onChange],
  );

  const saveSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    savedSelectionRef.current = range.cloneRange();
  }, []);

  const getEditorRange = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return null;
    return range;
  }, []);

  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const range = savedSelectionRef.current;
    if (!editor || !selection || !range) return null;
    editor.focus();
    selection.removeAllRanges();
    selection.addRange(range);
    return selection.getRangeAt(0);
  }, []);

  const exec = useCallback((command: string, val?: string) => {
    if (sourceMode) return;

    const editor = editorRef.current;
    const selection = window.getSelection();
    const hasValidSelection = Boolean(
      editor &&
      selection &&
      selection.rangeCount > 0 &&
      editor.contains(selection.getRangeAt(0).commonAncestorContainer),
    );

    if (!hasValidSelection) {
      restoreSelection();
    } else {
      editor?.focus();
    }

    document.execCommand(command, false, val);
    syncContent();
    saveSelection();
  }, [restoreSelection, saveSelection, sourceMode, syncContent]);

  const handleHeadingChange = useCallback(
    (val: string) => {
      setHeadingValue(val);
      if (sourceMode) return;

      const editor = editorRef.current;
      const selection = window.getSelection();
      const hasValidSelection = Boolean(
        editor &&
        selection &&
        selection.rangeCount > 0 &&
        editor.contains(selection.getRangeAt(0).commonAncestorContainer),
      );

      if (!hasValidSelection) {
        restoreSelection();
      } else {
        editor?.focus();
      }

      const formatBlockValue = val === "p" ? "p" : `<${val}>`;
      const beforeHtml = editor?.innerHTML;

      document.execCommand("formatBlock", false, formatBlockValue);
      if (val === "p") {
        document.execCommand("formatBlock", false, val);
      } else if (editor?.innerHTML === beforeHtml) {
        document.execCommand("formatBlock", false, val);
      }
      syncContent();
      saveSelection();
    },
    [restoreSelection, saveSelection, sourceMode, syncContent],
  );

  const applyFontSize = useCallback(
    (fontSize: string) => {
      if (sourceMode) return;

      const editor = editorRef.current;
      const selection = window.getSelection();
      if (!editor || !selection) return;

      let range = getEditorRange();
      if (!range) {
        range = restoreSelection();
      }
      if (!range) return;

      editor.focus();

      const getTargetElement = () => {
        const node = range.commonAncestorContainer;
        if (node.nodeType === Node.ELEMENT_NODE) {
          return node as HTMLElement;
        }
        return node.parentElement;
      };

      const getFontSizeTarget = () =>
        getTargetElement()?.closest("span,p,div,li,h1,h2,h3,h4,h5,h6") as HTMLElement | null;

      if (range.collapsed) {
        const target = getFontSizeTarget();
        if (!target || !editor.contains(target)) return;

        target.style.fontSize = fontSize;
        savedSelectionRef.current = range.cloneRange();
        syncContent();
        saveSelection();
        return;
      }

      try {
        const selectedContent = range.cloneContents();
        const containsBlockElements = Boolean(
          selectedContent.querySelector?.("p,div,li,h1,h2,h3,h4,h5,h6,ul,ol"),
        );

        if (containsBlockElements) {
          const target = getFontSizeTarget();
          if (!target || !editor.contains(target)) return;

          target.style.fontSize = fontSize;
          savedSelectionRef.current = range.cloneRange();
          syncContent();
          saveSelection();
          return;
        }

        const span = document.createElement("span");
        span.style.fontSize = fontSize;
        span.appendChild(range.extractContents());
        range.insertNode(span);

        const nextRange = document.createRange();
        nextRange.selectNodeContents(span);
        nextRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(nextRange);
        savedSelectionRef.current = nextRange.cloneRange();
      } catch {
        const target = getFontSizeTarget();
        if (!target || !editor.contains(target)) return;

        target.style.fontSize = fontSize;
        savedSelectionRef.current = range.cloneRange();
      }

      syncContent();
      saveSelection();
    },
    [getEditorRange, restoreSelection, saveSelection, sourceMode, syncContent],
  );

  const handleFontSizeChange = useCallback(
    (val: string) => {
      setFontSizeValue(val);
      if (val === CUSTOM_FONT_SIZE_OPTION) {
        return;
      }

      setCustomFontSize(val.replace(/px$/i, ""));
      applyFontSize(val);
    },
    [applyFontSize],
  );

  const applyCustomFontSize = useCallback(() => {
    const trimmed = customFontSize.trim();
    const numericSize = Number(trimmed);
    if (!Number.isFinite(numericSize) || numericSize <= 0) {
      return;
    }

    applyFontSize(`${numericSize}px`);
  }, [applyFontSize, customFontSize]);

  const canApplyCustomFontSize =
    Number.isFinite(Number(customFontSize.trim())) && Number(customFontSize.trim()) > 0;

  const insertPlaceholder = useCallback(
    (token: string) => {
      if (sourceMode) {
        const textarea = sourceEditorRef.current;
        const start = textarea?.selectionStart ?? sourceValue.length;
        const end = textarea?.selectionEnd ?? sourceValue.length;
        const nextValue = `${sourceValue.slice(0, start)}${token}${sourceValue.slice(end)}`;

        syncSourceContent(nextValue);
        setVariableSearch("");
        setVariablesOpen(false);

        requestAnimationFrame(() => {
          textarea?.focus();
          textarea?.setSelectionRange(start + token.length, start + token.length);
        });
        return;
      }

      const selection = window.getSelection();
      if (!selection) return;

      let range = getEditorRange();
      if (!range) {
        range = restoreSelection();
      }
      if (!range) return;

      range.deleteContents();
      const textNode = document.createTextNode(token);
      range.insertNode(textNode);

      const nextRange = document.createRange();
      nextRange.setStartAfter(textNode);
      nextRange.collapse(true);

      selection.removeAllRanges();
      selection.addRange(nextRange);
      savedSelectionRef.current = nextRange.cloneRange();
      setVariableSearch("");
      setVariablesOpen(false);
      syncContent();
    },
    [getEditorRange, restoreSelection, sourceMode, sourceValue, syncContent, syncSourceContent],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      const htmlData = clipboardData.getData("text/html");
      if (htmlData) {
        e.preventDefault();
        // Clean the HTML but preserve formatting (bold, headings, alignment, lists, etc.)
        const temp = document.createElement("div");
        temp.innerHTML = htmlData;
        // Remove scripts, styles, meta tags for safety
        temp.querySelectorAll("script, style, meta, link, head, title").forEach((el) => el.remove());
        // Remove potentially dangerous attributes but keep style for formatting
        const allElements = temp.querySelectorAll("*");
        allElements.forEach((el) => {
          const allowedAttrs = ["style", "class", "align", "data-placeholder", "contenteditable"];
          const attrsToRemove: string[] = [];
          for (let i = 0; i < el.attributes.length; i++) {
            const attrName = el.attributes[i].name.toLowerCase();
            if (!allowedAttrs.includes(attrName)) {
              attrsToRemove.push(attrName);
            }
          }
          attrsToRemove.forEach((attr) => el.removeAttribute(attr));
          // Clean style to keep only formatting-related properties
          if (el instanceof HTMLElement && el.style.cssText) {
            const allowedStyles = [
              "font-weight", "font-style", "text-decoration", "text-align",
              "font-size", "color", "background-color", "margin", "padding",
              "margin-left", "margin-right", "padding-left", "padding-right",
              "text-indent", "line-height", "font-family",
            ];
            const currentStyle = el.style;
            const newStyle: string[] = [];
            allowedStyles.forEach((prop) => {
              const val = currentStyle.getPropertyValue(prop);
              if (val) newStyle.push(`${prop}: ${val}`);
            });
            el.setAttribute("style", newStyle.join("; "));
            if (!el.getAttribute("style")) el.removeAttribute("style");
          }
        });
        const cleanHtml = temp.innerHTML;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const fragment = range.createContextualFragment(cleanHtml);
        range.insertNode(fragment);
        // Move cursor to end of pasted content
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        savedSelectionRef.current = range.cloneRange();
        syncContent();
      }
      // If no HTML data, let the browser handle plain text paste naturally
    },
    [syncContent],
  );

  const filteredPlaceholderVariables = PLACEHOLDER_VARIABLES.filter((pv) => {
    const query = variableSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      pv.label.toLowerCase().includes(query) ||
      pv.token.toLowerCase().includes(query)
    );
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (sourceMode) return;

      if (e.key === "b" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        exec("bold");
      } else if (e.key === "i" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        exec("italic");
      } else if (e.key === "u" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        exec("underline");
      } else if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        exec("undo");
      } else if (
        (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        (e.key === "y" && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        exec("redo");
      }
    },
    [exec, sourceMode],
  );

  const toggleSourceMode = useCallback(() => {
    const measuredHeight = editorRef.current?.offsetHeight || sourceEditorRef.current?.offsetHeight || 0;
    if (measuredHeight > 0) {
      setSourceEditorHeight(`${measuredHeight}px`);
    }

    if (sourceMode) {
      const normalizedSource = normalizeVariableHtml(sourceValue);
      setSourceMode(false);
      isInternalChange.current = true;
      onChange(normalizedSource);

      requestAnimationFrame(() => {
        if (!editorRef.current) return;
        editorRef.current.innerHTML = normalizedSource;
        editorRef.current.focus();
      });
      return;
    }

    const nextSource = normalizeVariableHtml(editorRef.current?.innerHTML || value || "");
    setSourceValue(nextSource);
    setSourceMode(true);

    requestAnimationFrame(() => {
      sourceEditorRef.current?.focus();
    });
  }, [onChange, sourceMode, sourceValue, value]);

  const ToolbarButton = ({
    icon: Icon,
    command,
    value: cmdVal,
    title,
  }: {
    icon: React.ElementType;
    command: string;
    value?: string;
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      title={title}
      disabled={sourceMode}
      onMouseDown={(e) => {
        e.preventDefault();
        exec(command, cmdVal);
      }}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="rounded-lg border border-border bg-background">
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30 rounded-t-lg sticky top-0 z-10"
        onMouseDownCapture={saveSelection}
        onPointerDownCapture={saveSelection}
      >
        {/* Heading Dropdown */}
        <Select value={headingValue} onValueChange={handleHeadingChange} disabled={sourceMode}>
          <SelectTrigger className="h-8 w-[110px] text-xs" onMouseDown={() => saveSelection()}>
            <SelectValue placeholder="Paragraph" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="p">
              <span className="text-xs">Paragraph</span>
            </SelectItem>
            <SelectItem value="h1">
              <span className="text-lg font-bold">Heading 1</span>
            </SelectItem>
            <SelectItem value="h2">
              <span className="text-base font-bold">Heading 2</span>
            </SelectItem>
            <SelectItem value="h3">
              <span className="text-sm font-bold">Heading 3</span>
            </SelectItem>
            <SelectItem value="h4">
              <span className="text-sm font-semibold">Heading 4</span>
            </SelectItem>
            <SelectItem value="h5">
              <span className="text-xs font-semibold">Heading 5</span>
            </SelectItem>
            <SelectItem value="h6">
              <span className="text-xs font-medium">Heading 6</span>
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={fontSizeValue} onValueChange={handleFontSizeChange} disabled={sourceMode}>
          <SelectTrigger className="h-8 w-[96px] text-xs" onMouseDown={() => saveSelection()}>
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_FONT_SIZE_OPTION}>Custom...</SelectItem>
          </SelectContent>
        </Select>

        {fontSizeValue === CUSTOM_FONT_SIZE_OPTION && (
          <div className="ml-1 flex items-center gap-1">
            <Input
              type="number"
              min="1"
              step="1"
              value={customFontSize}
              disabled={sourceMode}
              className="h-8 w-[82px] text-xs"
              placeholder="16"
              onChange={(event) => setCustomFontSize(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyCustomFontSize();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              disabled={sourceMode || !canApplyCustomFontSize}
              onClick={applyCustomFontSize}
            >
              Apply
            </Button>
          </div>
        )}

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Text Formatting */}
        <ToolbarButton icon={Bold} command="bold" title="Bold (Ctrl+B)" />
        <ToolbarButton icon={Italic} command="italic" title="Italic (Ctrl+I)" />
        <ToolbarButton icon={Underline} command="underline" title="Underline (Ctrl+U)" />
        <ToolbarButton icon={Strikethrough} command="strikeThrough" title="Strikethrough" />

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Lists */}
        <ToolbarButton icon={List} command="insertUnorderedList" title="Bullet List" />
        <ToolbarButton icon={ListOrdered} command="insertOrderedList" title="Numbered List" />

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Alignment */}
        <ToolbarButton icon={AlignLeft} command="justifyLeft" title="Align Left" />
        <ToolbarButton icon={AlignCenter} command="justifyCenter" title="Align Center" />
        <ToolbarButton icon={AlignRight} command="justifyRight" title="Align Right" />

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Font Color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={sourceMode}
              className="h-8 w-8 p-0"
              title="Text Color"
              onMouseDown={() => saveSelection()}
            >
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <p className="text-xs font-medium mb-2 text-muted-foreground">Text Color</p>
            <div className="grid grid-cols-4 gap-1">
              {FONT_COLORS.map((color) => (
                <button
                  key={color}
                  className="w-7 h-7 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    exec("foreColor", color);
                  }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Highlight Color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={sourceMode}
              className="h-8 w-8 p-0"
              title="Highlight"
              onMouseDown={() => saveSelection()}
            >
              <Highlighter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <p className="text-xs font-medium mb-2 text-muted-foreground">Highlight</p>
            <div className="grid grid-cols-4 gap-1">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color}
                  className="w-7 h-7 rounded border border-border hover:scale-110 transition-transform"
                  style={{
                    backgroundColor: color === "transparent" ? "white" : color,
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    exec("hiliteColor", color);
                  }}
                >
                  {color === "transparent" && (
                    <span className="text-xs text-muted-foreground">x</span>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted-foreground">Custom Color</span>
                <div className="flex items-center gap-2">
                  <span
                    className="h-6 w-6 rounded border border-border"
                    style={{ backgroundColor: customHighlightColor }}
                  />
                  <input
                    type="color"
                    value={customHighlightColor}
                    title="Choose custom highlight color"
                    className="h-8 w-10 cursor-pointer rounded border border-border bg-background p-1"
                    onChange={(e) => {
                      const nextColor = e.target.value;
                      setCustomHighlightColor(nextColor);
                      exec("hiliteColor", nextColor);
                    }}
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Clear Formatting */}
        <ToolbarButton icon={RemoveFormatting} command="removeFormat" title="Clear Formatting" />

        {/* Undo / Redo */}
        <ToolbarButton icon={Undo2} command="undo" title="Undo (Ctrl+Z)" />
        <ToolbarButton icon={Redo2} command="redo" title="Redo (Ctrl+Y)" />

        {onSave && (
          <>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-8 px-3 text-xs"
              title="Save Template"
              onClick={onSave}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </>
        )}

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Placeholder Variables */}
        <Popover
          open={variablesOpen}
          onOpenChange={(open) => {
            setVariablesOpen(open);
            if (open) {
              saveSelection();
              return;
            }
            setVariableSearch("");
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              title="Insert Variable"
              onMouseDown={() => saveSelection()}
            >
              <Variable className="h-3.5 w-3.5" />
              Variables
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-0"
            align="start"
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <Command shouldFilter={false}>
              <CommandInput
                autoFocus
                placeholder="Search variables..."
                value={variableSearch}
                onValueChange={setVariableSearch}
              />
              <CommandList className="max-h-72">
                <CommandEmpty>No matching variables.</CommandEmpty>
                {filteredPlaceholderVariables.map((pv) => (
                  <CommandItem
                    key={pv.token}
                    value={`${pv.label} ${pv.token}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                    onSelect={() => insertPlaceholder(pv.token)}
                  >
                    <span className="font-medium">{pv.label}</span>
                    <span className="max-w-[150px] truncate font-mono text-[10px] text-muted-foreground">
                      {pv.token}
                    </span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          type="button"
          variant={sourceMode ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs gap-1.5"
          title={sourceMode ? "Switch to visual editor" : "Switch to HTML code mode"}
          onClick={toggleSourceMode}
        >
          <Type className="h-3.5 w-3.5" />
          {sourceMode ? "Visual" : "Code"}
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Copy AI Reference Guide */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          title="Copy formatting reference for AI"
          onClick={() => {
            navigator.clipboard.writeText(buildLetterEditorAiGuide()).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <ClipboardCopy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied!" : "Copy Guide"}
        </Button>
      </div>

      {/* Editor Area – code mode replaces the visual editor in-place */}
      {sourceMode ? (
        <textarea
          ref={sourceEditorRef}
          value={sourceValue}
          spellCheck={false}
          className="w-full resize-none overflow-auto rounded-b-lg bg-background px-4 py-3 font-mono text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ minHeight, height: sourceEditorHeight || minHeight }}
          placeholder="Paste or type raw HTML here..."
          onChange={(e) => syncSourceContent(e.target.value)}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="px-4 py-3 outline-none prose prose-sm max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-1 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:mb-1 [&_h5]:text-sm [&_h5]:font-semibold [&_h5]:mb-1 [&_h6]:text-xs [&_h6]:font-medium [&_h6]:mb-1 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 text-sm"
          style={{ minHeight }}
          onInput={syncContent}
          onKeyDown={handleKeyDown}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onFocus={saveSelection}
          onPaste={handlePaste}
          data-placeholder={placeholder}
        />
      )}

      {/* Empty state placeholder */}
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          display: block;
        }
      `}</style>
    </div>
  );
}

export function htmlToPlainText(html: string): string {
  const temp = document.createElement("div");
  temp.innerHTML = normalizeVariableHtml(html);
  return temp.textContent || temp.innerText || "";
}

export function plainTextToHtml(text: string): string {
  if (!text) return "";
  if (text.includes("<") && text.includes(">")) return normalizeVariableHtml(text);
  let html = text
    .split("\n\n")
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return html;
}

export { PLACEHOLDER_VARIABLES };
