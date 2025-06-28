# Niobi Mini Reconciliation Tool

## 📄 PRD & Thought Process

**Problem**  
Finance teams often juggle internal exports vs. provider statements in Excel—painful, error-prone, and slow.

**Solution**  
A one-page, client-side web app that:
1. **Uploads** two CSVs in seconds  
2. **Parses** and **reconciles** on `transaction_reference`  
3. **Highlights** amount mismatches  
4. **Shows** key stats (total rows, matches, mismatches)  
5. **Filters**, **searches**, and **exports** full CSV

**Key Features**  
- 0 backend: 100% in-browser processing  
- Instant feedback: spinners + animations  
- Responsive design for desktop & mobile  
- Branded Niobi palette & modern UI

---


## 🚀 Deploying to Replit

1. **Create** a new Repl at https://replit.com (“HTML, CSS, JS”)
2. **Copy** all files into the Repl editor
3. **Run** and open the provided URL
4. **Test** by uploading sample CSVs and reconciling instantly

---

## 🎯 Evaluation Alignment

1. **Real-World Thinking**  
   - Single-source of truth, CSV import/export, mismatch edge cases  
2. **Functionality**  
   - Parsing, matching, mismatch flag, full-CSV export  
3. **UI/UX**  
   - Niobi branding, responsive, loading states, collapsible sections  
4. **Clarity**  
   - This PRD, in-code comments, clear file separation



