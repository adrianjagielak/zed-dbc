; ─────────────────────────────────────────────────────────────────────────────
; brackets.scm — bracket pair matching for Zed
;
; DBC uses four kinds of paired delimiters:
;   ( ... )  — signal scaling:     (factor, offset)
;   [ ... ]  — signal bounds:      [min|max]
;   " ... "  — quoted strings for units, labels, comments, attribute names
;
; We don't declare the `|` separator as a bracket because it is not an open/
; close pair — it's an infix separator.
; ─────────────────────────────────────────────────────────────────────────────

("(" @open ")" @close)
("[" @open "]" @close)
