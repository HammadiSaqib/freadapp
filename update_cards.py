import sys

file_path = r'e:\ScoreMachineV2RawCode-master\client\pages\CreditReport.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    (
        'className="text-left bg-white rounded-lg p-4 border border-gray-100"',
        'className="text-left bg-white rounded-lg p-4 border border-gray-100 dark:bg-slate-900 dark:border-slate-800"'
    ),
    (
        'className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100"',
        'className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100 dark:from-blue-950/40 dark:to-indigo-950/40 dark:border-blue-900/40"'
    ),
    (
        'className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100"',
        'className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100 dark:from-purple-950/40 dark:to-pink-950/40 dark:border-purple-900/40"'
    ),
    (
        'className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100"',
        'className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100 dark:from-green-950/40 dark:to-emerald-950/40 dark:border-green-900/40"'
    ),
    (
        'className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-100"',
        'className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-100 dark:bg-slate-800 dark:border-slate-700"'
    ),
    (
        'className="bg-gradient-to-r from-white via-gray-50/30 to-white border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-gray-300 mb-6"',
        'className="bg-gradient-to-r from-white via-gray-50/30 to-white border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-gray-300 mb-6 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 dark:border-slate-800"'
    ),
    (
        'className="bg-gradient-to-br from-slate-50 via-white to-slate-100 rounded-xl p-5 border border-slate-200 shadow-md hover:shadow-lg transition-shadow"',
        'className="bg-gradient-to-br from-slate-50 via-white to-slate-100 rounded-xl p-5 border border-slate-200 shadow-md hover:shadow-lg transition-shadow dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:border-slate-700"'
    )
]

for old, new in replacements:
    content = content.replace(old, new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
