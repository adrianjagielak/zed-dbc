; ─────────────────────────────────────────────────────────────────────────────
; highlights.scm — DBC syntax highlighting for Zed
;
; Capture groups follow the Helix/Zed convention. Where semantic meaning
; deviates from textbook conventions, the intent is: make the *structural*
; pieces of a DBC file pop so that a reviewer scanning a message definition
; can instantly pick out the message id, signal name, bit layout, and
; receivers without reading left-to-right.
; ─────────────────────────────────────────────────────────────────────────────

; ─── Top-level stanza keywords ───────────────────────────────────────────────
; These captures are scoped to specific parent nodes so that the anonymous
; 'CM_' / 'BA_DEF_' / … tokens that appear inside `ns_symbol` (the NS_ header)
; don't get double-colored as both @constant.builtin AND @keyword.
(version       "VERSION" @keyword)
(new_symbols   "NS_" @keyword)
(bit_timing    "BS_" @keyword)
(nodes         "BU_" @keyword)

(message               "BO_" @keyword)
(signal                "SG_" @keyword)
(message_transmitters  "BO_TX_BU_" @keyword)

(comment                   "CM_" @keyword.directive)
(attribute_definition      "BA_DEF_" @keyword.directive)
(attribute_definition_rel  "BA_DEF_REL_" @keyword.directive)
(attribute_default         "BA_DEF_DEF_" @keyword.directive)
(attribute_default_rel     "BA_DEF_DEF_REL_" @keyword.directive)
(attribute_value           "BA_" @keyword.directive)
(attribute_value_rel       "BA_REL_" @keyword.directive)

(value_definitions            "VAL_" @keyword)
(value_table                  "VAL_TABLE_" @keyword)
(signal_group                 "SIG_GROUP_" @keyword)
(signal_extended_value_type   "SIG_VALTYPE_" @keyword)
(signal_multiplexed_value     "SG_MUL_VAL_" @keyword)

(environment_variable       "EV_" @keyword)
(environment_variable_data  "ENVVAR_DATA_" @keyword)
(signal_type                "SGTYPE_" @keyword)
(signal_type_ref            "SGTYPE_" @keyword)

; ─── Object-kind tags when used inline (e.g. inside CM_ / BA_) ───────────────
(object_kind) @type.builtin
(rel_kind)    @type.builtin

; ─── Attribute type names (INT / HEX / FLOAT / STRING / ENUM) ────────────────
(attr_type_name) @type.builtin

; ─── NS_ symbol list ─────────────────────────────────────────────────────────
(ns_symbol) @constant.builtin

; ─── Messages, signals, nodes ────────────────────────────────────────────────
(message
  name: (identifier) @function)

(signal
  name: (identifier) @property)

; Signal-level multiplexer indicator: M, m0, m3M
(mux_indicator) @keyword.modifier

; Node / ECU references anywhere they appear (transmitter, receivers,
; BU_ list, BO_TX_BU_, CM_ BU_, attribute objects).
(node_ref) @variable

; ─── Fields cross-referenced from CM_ / BA_ / VAL_ / SIG_* ───────────────────
; Treat the referenced signal name as a property so it matches how the
; original SG_ definition is colored.
(comment
  signal_name: (identifier) @property)

(attribute_value
  (_
    (identifier) @property))

(value_definitions
  signal_name: (identifier) @property)

(signal_group
  name: (identifier) @function)

(signal_extended_value_type
  signal_name: (identifier) @property)

(signal_multiplexed_value
  multiplexed_signal: (identifier) @property
  multiplexor_switch: (identifier) @property)

; Value tables are named entities — highlight the declared name like a type
; and the referenced name (from SGTYPE_ / BA_DEF_DEF_) the same.
(value_table
  name: (identifier) @type)

(signal_type
  name: (identifier) @type
  value_table: (identifier) @type)

(signal_type_ref
  sgtype_name: (identifier) @type)

; Environment variables
(environment_variable
  name: (identifier) @function)

(environment_variable_data
  name: (identifier) @function)

(comment
  env_var: (identifier) @function)

(value_definitions
  env_var: (identifier) @function)

; Access type in EV_ lines (e.g. DUMMY_NODE_VECTOR0)
(environment_variable
  access_type: (identifier) @constant.builtin)

; ─── Byte order / value-type micro-tokens inside SG_ ─────────────────────────
; "@0" (big-endian / Motorola) vs "@1" (little-endian / Intel)
; "+"  (unsigned)              vs "-"  (signed)
(byte_order)  @constant.builtin
(value_type)  @operator

; ─── Numbers ─────────────────────────────────────────────────────────────────
(integer) @number
(number)  @number

; ─── Strings (units, comments, value-table labels, attribute names) ──────────
(string) @string

; The names inside BA_DEF_ / BA_ are conceptually attribute identifiers.
(attribute_definition
  name: (string) @attribute)
(attribute_definition_rel
  name: (string) @attribute)
(attribute_default
  name: (string) @attribute)
(attribute_default_rel
  name: (string) @attribute)
(attribute_value
  name: (string) @attribute)
(attribute_value_rel
  name: (string) @attribute)

; ─── Line comments (informal, non-spec but tolerated) ────────────────────────
(line_comment) @comment

; ─── Punctuation ─────────────────────────────────────────────────────────────
[ "(" ")" "[" "]" ] @punctuation.bracket
[ ":" ";" ]         @punctuation.delimiter
","                 @punctuation.delimiter
"|"                 @operator
"@"                 @operator
"-"                 @operator
