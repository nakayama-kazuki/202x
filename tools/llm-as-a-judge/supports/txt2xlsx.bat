@python -c "import sys; sys.argv[0]=r'%~f0'; exec(''.join(open(r'%~f0', encoding='utf-8').readlines()[1:]))" %* || pause & goto:eof

import sys
import pathlib
import pandas

if len(sys.argv) < 2:
    sys.exit()

rows = []

for path in sys.argv[1:]:
    file = pathlib.Path(path)
    if not file.exists():
        print(f'{file} is skipped')
        continue
    rows.append({'filename' : file.name, 'text' : file.read_text(encoding='utf-8')})

if not rows:
    sys.exit()

df = pandas.DataFrame(rows)
output = pathlib.Path(sys.argv[0]).with_name('result.xlsx')
df.to_excel(output, index=False)

print(f'done : {output}')
