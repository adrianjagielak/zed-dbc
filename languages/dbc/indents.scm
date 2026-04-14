; ─────────────────────────────────────────────────────────────────────────────
; indents.scm — auto-indent hints for Zed
;
; DBC has essentially no indentation rules of its own. Every statement begins
; in column 0. The only de-facto convention is that the SG_ lines inside a BO_
; block are often indented one space below the BO_ header — but many files
; don't follow that, and no tool enforces it.
;
; We therefore:
;   * do NOT push indent inside BO_ (respect the source)
;   * indent inside the parenthesised (factor,offset) groups of a SG_ line
;     when the user manually splits them across multiple lines
;   * indent inside [min|max] similarly
;
; These rules only kick in when the user presses Enter inside an open pair;
; they never reformat existing content.
; ─────────────────────────────────────────────────────────────────────────────

[
  "("
  "["
] @indent

[
  ")"
  "]"
] @outdent
