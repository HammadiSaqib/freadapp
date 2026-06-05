import re

file_path = r"e:\ScoreMachineV2RawCode-master\client\pages\CreditReport.tsx"
start_line = 8742
end_line = 10876

# Define replacements (pattern, dark_class_to_add)
# We will construct the replacement string dynamically
replacements_map = [
    ('text-gray-900', 'dark:text-white'),
    ('text-gray-800', 'dark:text-white'),
    ('text-gray-700', 'dark:text-slate-200'),
    ('text-gray-600', 'dark:text-slate-300'),
    ('text-gray-500', 'dark:text-slate-400'),
    ('text-blue-700', 'dark:text-blue-400'),
    ('text-purple-700', 'dark:text-purple-400'),
    ('text-green-700', 'dark:text-green-400'),
    ('text-red-700', 'dark:text-red-400'),
    ('text-amber-700', 'dark:text-amber-400'),
    
    ('bg-white', 'dark:bg-slate-900'),
    ('bg-gray-50', 'dark:bg-slate-800'),
    ('border-gray-100', 'dark:border-slate-800'),
    ('border-gray-200', 'dark:border-slate-700'),
]

def apply_replacements(line):
    new_line = line
    
    for pattern, dark_class in replacements_map:
        if pattern in new_line:
            # Check if this specific element already has a dark mode class of the same type
            # This is tricky with simple string matching. 
            # We'll use a heuristic: if the line contains a dark class of the same category (bg, text, border) 
            # in close proximity or just anywhere in the line (simplified).
            
            # For text colors, we want to ensure we don't overwrite or double up if ANY dark:text- is present?
            # No, different elements on the same line might need different colors.
            # But here we are replacing a specific class string.
            # So we check if the replacement (e.g. "text-gray-800 dark:text-white") is already there.
            
            # Better heuristic:
            # If we match 'text-gray-800', check if 'dark:text-' follows it immediately or is already in the line?
            # Let's stick to the previous logic: check if the specific dark class we want to add is already there.
            # AND for backgrounds, check if ANY dark background is set to avoid conflicts.
            
            if 'bg-' in pattern:
                # For backgrounds, be conservative. If any dark:bg- is in the line, skip.
                if 'dark:bg-' in new_line:
                    continue
            
            if 'border-' in pattern:
                 # For borders, similar.
                 if 'dark:border-' in new_line:
                     continue
            
            # For text, we might have multiple text spans on one line.
            # So checking "dark:text-" globally in the line is bad if there are multiple text elements.
            # But checking if the specific replacement is present is safe.
            
            replacement_str = f"{pattern} {dark_class}"
            
            # Check if we already did this replacement
            if replacement_str in new_line:
                continue
                
            # Check if the pattern is already followed by a dark class (e.g. manually added different one)
            # Regex to look for pattern followed by space and dark:
            # e.g. text-gray-800 dark:text-gray-200
            # We want to avoid adding dark:text-white if dark:text-gray-200 is there.
            
            type_prefix = dark_class.split('-')[0] + '-' # e.g. dark:text-
            
            # If the pattern is found, we want to replace it. 
            # But we should be careful. 
            # Let's use simple replacement for now but ensure we don't double add.
            
            # If we are replacing 'text-gray-800', and the line has 'text-gray-800',
            # We replace it with 'text-gray-800 dark:text-white'.
            
            # What if it's 'text-gray-800 dark:text-slate-200'?
            # Our simple check 'replacement_str in new_line' (text-gray-800 dark:text-white) would be False.
            # So we would proceed to replace.
            # Result: 'text-gray-800 dark:text-white dark:text-slate-200'.
            # This is duplicate but Tailwind handles it (last wins usually). 
            # But it's messy.
            
            # To be cleaner: check if pattern is followed by type_prefix
            # This requires regex matching on the line.
            
            regex_pattern = re.escape(pattern) + r'(?!\s+' + re.escape(type_prefix) + r')'
            # This regex says: match pattern if NOT followed by space + type_prefix
            
            # Actually, let's just use the logic: if the specific dark class isn't there, add it.
            # AND if it's a background/border, respect existing dark classes (checked above).
            # For text, we'll just add it. If there's a conflict, the specific one we add (white) is likely what we want now.
            
            if dark_class not in new_line:
                 new_line = new_line.replace(pattern, replacement_str)

    return new_line

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    current_line_num = i + 1
    if start_line <= current_line_num <= end_line:
        modified_line = apply_replacements(line)
        new_lines.append(modified_line)
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Successfully updated text colors in range {start_line}-{end_line}.")
