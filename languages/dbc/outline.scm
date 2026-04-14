; ─────────────────────────────────────────────────────────────────────────────
; outline.scm — symbol outline for Zed's outline panel (cmd/ctrl+shift+O)
;
; The outline is the fastest way to navigate a large DBC. The canonical view:
;
;   BO_ 100 EngineData            ← messages (top level)
;     SG_ EngineSpeed               ← signals nested inside each message
;     SG_ CoolantTemp
;   VAL_TABLE_ OnOff              ← global value tables
;   EV_ SomeEnvVar                ← environment variables
;   SIG_GROUP_ PowertrainGroup    ← signal groups
;   BA_DEF_ "GenMsgCycleTime"     ← attribute definitions
;
; Zed outline captures:
;   @item      — the whole entity (range used for hit-testing & folding)
;   @name      — the primary label shown in the tree
;   @context   — secondary text (shown dimmed beside the name)
;   Structural nesting is inferred from node containment.
; ─────────────────────────────────────────────────────────────────────────────

; BO_ — messages. Use the message id as context so the outline reads
; "EngineData  100".
(message
  "BO_" @context
  id: (integer) @context
  name: (identifier) @name) @item

; SG_ — signals, nested inside their parent BO_.
(signal
  "SG_" @context
  name: (identifier) @name) @item

; VAL_TABLE_ — global value tables.
(value_table
  "VAL_TABLE_" @context
  name: (identifier) @name) @item

; SIG_GROUP_
(signal_group
  "SIG_GROUP_" @context
  name: (identifier) @name) @item

; EV_
(environment_variable
  "EV_" @context
  name: (identifier) @name) @item

; BA_DEF_ — attribute definitions (the string is already quoted).
(attribute_definition
  "BA_DEF_" @context
  name: (string) @name) @item
