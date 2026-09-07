"""One-shot/read-only probe for the FEFI Mayores B source.

Run with: python -m app.fefi_mayores_probe
It never writes to the database. It prints only table structure and rows that
mention Defensores, so the production parser can be implemented against the
actual source instead of assumptions.
"""
import re
import requests
from bs4 import BeautifulSoup
from .fefi_mayores import URL, UA, is_defe, clean


def main():
    r = requests.get(URL, headers=UA, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    print({"url": URL, "status": r.status_code, "title": clean(soup.title.get_text(" ", strip=True) if soup.title else ""), "tables": len(soup.find_all("table"))})
    for idx, table in enumerate(soup.find_all("table"), 1):
        rows=[]
        for tr in table.find_all("tr"):
            cells=[clean(x.get_text(" ", strip=True)) for x in tr.find_all(["th","td"])]
            if cells: rows.append(cells)
        if not rows: continue
        nearby=[]
        node=table
        for _ in range(6):
            node=node.find_previous() if node else None
            if not node: break
            txt=clean(node.get_text(" ",strip=True))
            if txt and len(txt)<180: nearby.append(txt)
        defe_rows=[row for row in rows if any(is_defe(cell) for cell in row)]
        print({"table":idx,"context":nearby[:4],"header":rows[0],"row_count":len(rows),"defe_rows":defe_rows})


if __name__ == "__main__":
    main()
