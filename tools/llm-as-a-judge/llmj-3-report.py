#!/usr/bin/env python3

import sys
import json

import llmj

try:
    import openpyxl
except ImportError:
    llmj.abort_missing_package('openpyxl')

def load_version(in_path):
    workbook = openpyxl.load_workbook(in_path, data_only=True)
    sheet = workbook.active
    cols = {}
    for key in llmj.TERM:
        cols[key] = llmj.find_column(sheet, llmj.TERM[key])
    rows = []
    for row in range(2, sheet.max_row + 1):
        original = sheet.cell(row, cols['ORIGINAL']).value
        generated = sheet.cell(row, cols['GENERATED']).value
        score = sheet.cell(row, cols['SCORE']).value
        reason = sheet.cell(row, cols['REASON']).value
        try:
            rubrics = json.loads(reason or '[]')
        except Exception:
            rubrics = []
        rows.append(
            {
                'original': original,
                'generated': generated,
                'score': score,
                'rubrics': rubrics,
            }
        )
    scores = [
        row['score']
        for row in rows
        if isinstance(row['score'], (int, float))
    ]
    avg_score = (
        sum(scores) / len(scores)
        if len(scores) > 0
        else 0
    )
    return {
        'name': in_path.name.removesuffix(llmj.SUFFIX_JUDGED),
        'avgScore': avg_score,
        'rows': rows,
    }

def build_html(in_data):
    return f'''
<html>
<head>
<meta charset="utf-8">
<title>LLMJ Report</title>
<style>

body {{
    font-family: sans-serif;
    margin: 20px;
}}

table {{
    border-collapse: collapse;
    margin-bottom: 24px;
}}

th,
td {{
    border: solid 1px #ccc;
    padding: 6px 10px;
    text-align: left;
    vertical-align: top;
}}

th.sortable {{
    cursor: pointer;
}}

pre {{
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
}}

.version {{
    margin-bottom: 48px;
}}

.article {{
    border: solid 1px #ccc;
    padding: 12px;
    margin-bottom: 16px;
}}

</style>
</head>
<body>
<h1>LLMJ Report</h1>
<div id="app"></div>
<script>

const DATA = {json.dumps(in_data, ensure_ascii=False)};

function escapeHtml(text) {{
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}}

function sortTable(tableId, col) {{
    const table = document.getElementById(tableId);
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const asc = table.dataset.sortCol != col || table.dataset.sortDir !== 'asc';
    rows.sort((a, b) => {{
        let av = a.children[col].dataset.sort ?? a.children[col].textContent;
        let bv = b.children[col].dataset.sort ?? b.children[col].textContent;
        const an = Number(av);
        const bn = Number(bv);
        if (!Number.isNaN(an) && !Number.isNaN(bn)) {{
            av = an;
            bv = bn;
        }}
        if (av < bv) return asc ? -1 : 1;
        if (av > bv) return asc ? 1 : -1;
        return 0;
    }});
    rows.forEach(row => tbody.appendChild(row));
    table.dataset.sortCol = col;
    table.dataset.sortDir = asc ? 'asc' : 'desc';
}}

(function() {{
    const app = document.getElementById('app');
    const rubricNames = [];
    DATA.versions.forEach(v => {{
        v.rows.forEach(r => {{
            r.rubrics.forEach(x => {{
                if (!rubricNames.includes(x.rubric)) {{
                    rubricNames.push(x.rubric);
                }}
            }});
        }});
    }});
    let html = '';
    html += '<h2>Summary</h2>';
    html += '<table id="summaryTable">';
    html += '<thead>';
    html += '<tr>';
    html += '<th class="sortable" onclick="sortTable(\\'summaryTable\\',0)">Version</th>';
    html += '<th class="sortable" onclick="sortTable(\\'summaryTable\\',1)">Average Score</th>';
    html += '<th class="sortable" onclick="sortTable(\\'summaryTable\\',2)">Worst Score</th>';
    html += '<th class="sortable" onclick="sortTable(\\'summaryTable\\',3)">Articles</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody>';
    DATA.versions.forEach(v => {{
        let worstScore = null;
        let worstIndex = null;
        v.rows.forEach((r, index) => {{
            const score = Number(r.score);
            if (worstScore === null || score < worstScore) {{
                worstScore = score;
                worstIndex = index;
            }}
        }});
        html += '<tr>';
        html += `<td>${{escapeHtml(v.name)}}</td>`;
        html += `<td data-sort="${{v.avgScore}}">${{v.avgScore.toFixed(2)}}</td>`;
        html += `<td data-sort="${{worstScore}}"><a href="#article-${{v.name}}-${{worstIndex}}">${{worstScore.toFixed(2)}}</a></td>`;
        html += `<td data-sort="${{v.rows.length}}">${{v.rows.length}}</td>`;
        html += '</tr>';
    }});
    html += '</tbody>';
    html += '</table>';
    html += '<h2>Rubric Breakdown</h2>';
    html += '<table id="rubricTable">';
    html += '<thead>';
    html += '<tr>';
    html += '<th class="sortable" onclick="sortTable(\\'rubricTable\\',0)">Version</th>';
    let rubricCol = 1;
    rubricNames.forEach(name => {{
        html += `<th class="sortable" onclick="sortTable('rubricTable',${{rubricCol++}})">Avg ${{name}}</th>`;
        html += `<th class="sortable" onclick="sortTable('rubricTable',${{rubricCol++}})">Min ${{name}}</th>`;
    }});
    html += '</tr>';
    html += '</thead>';
    html += '<tbody>';
    DATA.versions.forEach(v => {{
        html += '<tr>';
        html += `<td>${{escapeHtml(v.name)}}</td>`;
        rubricNames.forEach(name => {{
            const scores = [];
            let minScore = null;
            let minIndex = null;
            v.rows.forEach((r, index) => {{
                r.rubrics.forEach(x => {{
                    if (x.rubric === name) {{
                        const score = Number(x.score);
                        scores.push(score);
                        if (minScore === null || score < minScore) {{
                            minScore = score;
                            minIndex = index;
                        }}
                    }}
                }});
            }});
            const avg =
                scores.length === 0
                    ? null
                    : scores.reduce((a,b)=>a+b,0) / scores.length;
            if (avg === null) {{
                html += '<td>-</td>';
                html += '<td>-</td>';
            }}
            else {{
                html += `<td data-sort="${{avg}}">${{avg.toFixed(2)}}</td>`;
                html += `<td data-sort="${{minScore}}"><a href="#article-${{v.name}}-${{minIndex}}">${{minScore.toFixed(2)}}</a></td>`;
            }}
        }});
        html += '</tr>';
    }});
    html += '</tbody>';
    html += '</table>';
    html += '<h2>Details</h2>';
    DATA.versions.forEach(v => {{
        html += '<div class="version">';
        html += `<h3>${{escapeHtml(v.name)}}</h3>`;
        v.rows.forEach((r, index) => {{
            html += `<div class="article" id="article-${{v.name}}-${{index}}">`;
            html += `<h4>#${{index + 1}} : score=${{r.score}}</h4>`;
            html += '<h5>Original</h5>';
            html += `<pre>${{escapeHtml(r.original || '')}}</pre>`;
            html += '<h5>Generated</h5>';
            html += `<pre>${{escapeHtml(r.generated || '')}}</pre>`;
            html += '<h5>Rubrics</h5>';
            html += '<table>';
            html += '<tr>';
            html += '<th>Rubric</th>';
            html += '<th>Score</th>';
            html += '<th>Reason</th>';
            html += '</tr>';
            r.rubrics.forEach(x => {{
                html += '<tr>';
                html += `<td>${{escapeHtml(x.rubric)}}</td>`;
                html += `<td>${{x.score}}</td>`;
                html += `<td><pre>${{escapeHtml(x.reason)}}</pre></td>`;
                html += '</tr>';
            }});
            html += '</table>';
            html += '</div>';
        }});
        html += '</div>';
    }});
    app.innerHTML = html;
}})();

</script>
</body>
</html>
'''

def main():
    versions = []
    for path in sorted(llmj.DIR_WORK.glob('*' + llmj.SUFFIX_JUDGED)):
        versions.append(load_version(path))
    if len(versions) == 0:
        print('ERROR : no judged files')
        llmj.abort()
    html = build_html(
        {
            'versions': versions
        }
    )
    out_path = llmj.DIR_WORK / llmj.FILE_REPORT
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'completed : {out_path.name}')
    llmj.finalize()

if __name__ == '__main__':
    main()
