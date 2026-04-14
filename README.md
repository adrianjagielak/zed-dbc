# zed-dbc

**Full `.dbc` (CAN database) file support for [Zed](https://zed.dev).**

DBC is the de-facto standard file format for describing CAN bus communication
in automotive, industrial, aerospace, and robotics systems. A single `.dbc`
can define thousands of signals across hundreds of messages and tens of ECUs.
Reading one without tooling support is painful. This extension makes Zed a
first-class editor for them.

---

## Features

- **Tree-sitter grammar** covering the full public DBC grammar:
  - `VERSION`, `NS_`, `BS_`, `BU_`
  - `BO_` messages with nested `SG_` signals (including all three
    multiplexing forms: `M`, `m<N>`, and extended `m<N>M`)
  - `BO_TX_BU_` multi-transmitter declarations
  - `CM_` comments on nodes, messages, signals and environment variables
  - `BA_DEF_`, `BA_DEF_DEF_`, `BA_` attribute system (INT, HEX, FLOAT,
    STRING, ENUM)
  - Relation attributes: `BA_DEF_REL_`, `BA_DEF_DEF_REL_`, `BA_REL_`
    (`BU_SG_REL_`, `BU_BO_REL_`, `BU_EV_REL_`)
  - `VAL_` value definitions (for signals and environment variables)
  - `VAL_TABLE_` global value tables
  - `SIG_GROUP_`, `SIG_VALTYPE_`, `SG_MUL_VAL_`
  - `EV_`, `ENVVAR_DATA_`, `SGTYPE_` (both forms)
- **Rich semantic highlighting**: messages, signals, nodes, multiplexers,
  byte-order markers, attribute names, value-table labels, and numeric
  fields are each colored distinctly.
- **Outline panel** (`cmd/ctrl+shift+O`): jump directly to any message,
  signal, value table, signal group, environment variable, or attribute
  definition.
- **Bracket matching & auto-close** for `(...)`, `[...]`, and `"..."`.
- **Forgiving parser**: tolerates the `//` line-comment convention used by
  several vendor tools, even though it isn't part of the formal spec.

---

## Installation

### As a dev extension (recommended while iterating)

1. Clone this repo:
   ```sh
   git clone https://github.com/adrianjagielak/zed-dbc.git
   ```
2. In Zed, open the command palette (`cmd/ctrl+shift+P`) and run
   **`zed: install dev extension`**, then pick the cloned directory.
3. Open any `.dbc` file. Highlighting kicks in immediately.

### From the Zed extension registry

Once published, search for **DBC** in `zed: extensions` and click install.

---

## How this repo is laid out

This single repository serves **two roles**:

1. The **Zed extension** (metadata + language queries in `languages/dbc/`).
2. The **tree-sitter-dbc grammar** (`grammar.js` at the root in standard
   tree-sitter layout).

Zed clones this repo once per role. The extension entry lives at the root
(`extension.toml`); the grammar entry points — `grammar.js`, `package.json`,
and the eventually-generated `src/parser.c` — also live at the root, which
is the layout `tree-sitter generate` expects.

```
.
├── extension.toml              # Zed extension manifest
├── grammar.js                  # tree-sitter-dbc grammar
├── package.json                # tree-sitter package manifest
├── languages/
│   └── dbc/
│       ├── config.toml         # language behaviour (brackets, comments, …)
│       ├── highlights.scm      # syntax highlighting captures
│       ├── outline.scm         # outline-panel symbol tree
│       ├── brackets.scm        # bracket-pair matching
│       ├── indents.scm         # auto-indent hints
│       └── injections.scm      # (no injections; placeholder)
├── test/
│   └── corpus/                 # tree-sitter corpus tests
├── LICENSE
└── README.md
```

---

## Publishing workflow

The Zed extension registry requires every grammar to be pinned to a specific
git commit. The reference lives in `extension.toml`:

```toml
[grammars.dbc]
repository = "https://github.com/adrianjagielak/zed-dbc"
commit     = "REPLACE_WITH_PUBLISHED_COMMIT_SHA"
```

Before publishing:

1. Push your changes and note the commit SHA of `main`.
2. Replace `REPLACE_WITH_PUBLISHED_COMMIT_SHA` with that SHA.
3. Bump `version` in `extension.toml`.
4. Open a PR against
   [`zed-industries/extensions`](https://github.com/zed-industries/extensions)
   adding this repo to the registry.

If you prefer the conventional two-repo layout (separate `tree-sitter-dbc`
and `zed-dbc`), copy `grammar.js`, `package.json`, and `src/` into a new
`tree-sitter-dbc` repo and point `extension.toml` at it instead. No other
files in this repo need to change.

---

## Building the grammar locally

The grammar is a standard tree-sitter project. Zed will run
`tree-sitter generate` on install — you do **not** need to commit the
generated `src/parser.c`. To work on the grammar directly:

```sh
npm install                  # pulls tree-sitter-cli
npx tree-sitter generate     # produces src/parser.c + src/grammar.json
npx tree-sitter test         # runs corpus tests in test/corpus/
npx tree-sitter parse a.dbc  # parse a real file and print the tree
```

Test cases under `test/corpus/` cover the major stanzas and the multiplexing
forms. Contributions that add tricky real-world DBCs (as minimal excerpts)
are welcome.

---

## DBC syntax cheat-sheet

Quick reference for the pieces the grammar understands. Every statement
starts at column 0; `<...>` marks a field and `[...]` marks an optional
section. Strings are always double-quoted.

### Header

```dbc
VERSION "1.0"

NS_ :
    NS_DESC_
    CM_
    BA_DEF_
    BA_
    VAL_
    CAT_DEF_
    CAT_
    FILTER
    BA_DEF_DEF_
    EV_DATA_
    ENVVAR_DATA_
    SGTYPE_
    SGTYPE_VAL_
    BA_DEF_SGTYPE_
    BA_SGTYPE_
    SIG_TYPE_REF_
    VAL_TABLE_
    SIG_GROUP_
    SIG_VALTYPE_
    SIGTYPE_VALTYPE_
    BO_TX_BU_
    BA_DEF_REL_
    BA_REL_
    BA_DEF_DEF_REL_
    BU_SG_REL_
    BU_EV_REL_
    BU_BO_REL_
    SG_MUL_VAL_

BS_:

BU_: ECU1 ECU2 Gateway
```

### Messages and signals

```dbc
BO_ <msg_id> <msg_name>: <dlc> <transmitter>
 SG_ <sig_name> [<mux>] : <start_bit>|<length>@<byte_order><value_type> (<factor>,<offset>) [<min>|<max>] "<unit>" <receiver>,<receiver>,…
```

- `<msg_id>` — 11-bit classical CAN (0–0x7FF) or 29-bit extended with the
  top bit set (`id | 0x80000000`). The grammar treats it as a bare integer.
- `<byte_order>` — `1` = Intel (little-endian), `0` = Motorola (big-endian).
- `<value_type>` — `+` = unsigned, `-` = signed.
- `<mux>`:
  - `M` — this signal is the multiplexor switch.
  - `m<N>` — this signal is present only when the switch equals N.
  - `m<N>M` — extended multiplexing: both a switch *and* multiplexed.
- Receivers are comma-separated. `Vector__XXX` is the convention for
  "no receivers".

### Comments

```dbc
CM_                           "<file-level comment>" ;
CM_ BU_ <node>                "<node comment>" ;
CM_ BO_ <msg_id>              "<message comment>" ;
CM_ SG_ <msg_id> <sig>        "<signal comment>" ;
CM_ EV_ <env_var>             "<env-var comment>" ;
```

### Attributes

```dbc
BA_DEF_ [BU_|BO_|SG_|EV_] "<name>" INT    <min> <max> ;
BA_DEF_ [BU_|BO_|SG_|EV_] "<name>" HEX    <min> <max> ;
BA_DEF_ [BU_|BO_|SG_|EV_] "<name>" FLOAT  <min> <max> ;
BA_DEF_ [BU_|BO_|SG_|EV_] "<name>" STRING ;
BA_DEF_ [BU_|BO_|SG_|EV_] "<name>" ENUM   "A","B","C" ;

BA_DEF_DEF_ "<name>" <default> ;

BA_ "<name>"                          <value> ;   ; global
BA_ "<name>" BU_ <node>               <value> ;
BA_ "<name>" BO_ <msg_id>             <value> ;
BA_ "<name>" SG_ <msg_id> <sig>       <value> ;
BA_ "<name>" EV_ <env_var>            <value> ;
```

Relation attributes use the same pattern with `BA_DEF_REL_`,
`BA_DEF_DEF_REL_`, and `BA_REL_`, where the object kind is one of
`BU_SG_REL_`, `BU_BO_REL_`, or `BU_EV_REL_`.

### Value tables

```dbc
; inline on a signal
VAL_ <msg_id> <sig_name> 0 "Off" 1 "On" 2 "Error" ;

; inline on an environment variable
VAL_ <env_var> 0 "Off" 1 "On" ;

; reusable global table
VAL_TABLE_ OnOff 0 "Off" 1 "On" ;
```

### Multiplexing & signal groups

```dbc
SIG_GROUP_   <msg_id> <group_name> <repetitions> : <sig_name> <sig_name> … ;
SIG_VALTYPE_ <msg_id> <sig_name> : <type> ;        ; 0=int 1=float 2=double
SG_MUL_VAL_  <msg_id> <mux_sig> <switch_sig> <lo>-<hi>, <lo>-<hi>, … ;
```

### Environment variables

```dbc
EV_ <name>: <type> [<min>|<max>] "<unit>" <initial> <ev_id> <access_type> <access_node>,… ;
ENVVAR_DATA_ <name>: <data_size>;
```

---

## Known limitations

- There is no LSP, so cross-reference validation (e.g. *"this `VAL_` refers to
  a signal that doesn't exist in message 0x100"*) is not diagnosed. A
  companion LSP is a natural follow-up and the grammar is structured to
  support it — the exported node fields (`message_id`, `signal_name`,
  `node`, …) are exactly the references an LSP would need.
- A handful of ancient vendor-specific stanzas (`CAT_DEF_`, `CAT_`,
  `FILTER`, `SIGTYPE_VALTYPE_`) appear in the `NS_` preamble but are
  essentially never emitted in the wild; they are listed in `NS_` for
  parsing but not treated as first-class statements.
- String escape semantics are not interpreted. The grammar tolerates
  `\"`-style escapes because real files contain them; the actual meaning
  depends on the producing tool.

---

## Contributing

1. Add a minimal, self-contained DBC excerpt that reproduces the issue to
   `test/corpus/`.
2. Run `npx tree-sitter test` until it passes.
3. Open a PR — small fixes are very welcome.

---

## License

MIT. See [LICENSE](./LICENSE).
