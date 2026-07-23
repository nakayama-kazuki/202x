@python -c "import sys; sys.argv[0]=r'%~f0'; exec(''.join(open(r'%~f0', encoding='utf-8').readlines()[1:]))" %* || pause & goto:eof

import sys
import pathlib
import pandas

if len(sys.argv) < 2:
    sys.exit()

if len(sys.argv) == 2 and pathlib.Path(sys.argv[1]).suffix.lower() == '.xlsx':
    file = pathlib.Path(sys.argv[1])
    df = pandas.read_excel(file, header=None)
    digits = len(str(len(df) - 1))
    stem = file.stem
    delimiter = chr(10)
    for i, row in df.iterrows():
        path = file.with_name(stem + '-' + str(i).zfill(digits) + '.txt')
        text = ''
        for cell in row:
            if text:
                text += delimiter
            if not pandas.isna(cell):
                text += str(cell)
        path.write_text(text, encoding='utf-8')
    print(f'{len(df)} txt files created')
else:
    rows = []
    for path in sys.argv[1:]:
        file = pathlib.Path(path)
        if file.suffix.lower() != '.txt':
            continue
        rows.append({'filename' : file.name, 'text' : file.read_text(encoding='utf-8')})
    if not rows:
        sys.exit()
    df = pandas.DataFrame(rows)
    output = pathlib.Path(sys.argv[0]).with_name('result.xlsx')
    df.to_excel(output, index=False)
    print(f'xlsx file created')
