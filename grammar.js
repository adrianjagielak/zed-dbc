/**
 * tree-sitter-dbc
 *
 * A tree-sitter grammar for DBC (CAN database) files.
 *
 * DBC is the de-facto standard file format used by Vector Informatik's CANdb++
 * tool and consumed by virtually every CAN bus tool in the automotive industry
 * (CANoe, CANalyzer, BusMaster, Kvaser, python-can, cantools, can-utils, etc.).
 *
 * The format is line-oriented but permits significant variation between
 * producers. This grammar aims to parse the full CSS Electronics "DBC File
 * Format Documentation" (the closest thing to an official spec) while being
 * forgiving about whitespace, optional trailing semicolons, and missing
 * optional sections.
 *
 * References consulted while writing this grammar:
 *   - CSS Electronics, "DBC File Format Documentation" (public PDF)
 *   - Vector CANdb++ user guide (section "DBC syntax")
 *   - cantools (Python) source as a cross-check for real-world variations
 *   - Kvaser DBC primer
 */

module.exports = grammar({
  name: 'dbc',

  // DBC has no native line-comment syntax, but CM_ stanzas act as comments.
  // Several tools in the wild prepend "//" line comments; we accept them as
  // extras so such files parse cleanly.
  extras: $ => [
    /[\s\uFEFF]/,
    $.line_comment,
  ],

  rules: {
    source_file: $ => repeat($._top_level),

    _top_level: $ => choice(
      $.version,
      $.new_symbols,
      $.bit_timing,
      $.nodes,
      $.value_table,
      $.message,
      $.message_transmitters,
      $.environment_variable,
      $.environment_variable_data,
      $.signal_type,
      $.signal_type_ref,
      $.comment,
      $.attribute_definition,
      $.attribute_definition_rel,
      $.attribute_default,
      $.attribute_default_rel,
      $.attribute_value,
      $.attribute_value_rel,
      $.value_definitions,
      $.signal_group,
      $.signal_extended_value_type,
      $.signal_multiplexed_value,
    ),

    // ─── VERSION ────────────────────────────────────────────────────────────
    version: $ => seq(
      'VERSION',
      field('text', $.string),
    ),

    // ─── NS_  (new symbols) ─────────────────────────────────────────────────
    // NS_ introduces the list of token names the producing tool is prepared
    // to emit. These are drawn from a fixed vocabulary (there is no mechanism
    // for custom NS_ entries) so we enumerate them explicitly: this lets
    // tree-sitter keep them distinct from the actual top-level keywords that
    // share the same spelling (CM_, BA_DEF_, …) without needing a word rule.
    // Right-associative so that when the parser sees another ns_symbol token
    // after the list has started, it always extends the list instead of
    // terminating new_symbols and starting a new top-level statement.
    new_symbols: $ => prec.right(seq(
      'NS_',
      ':',
      repeat($.ns_symbol),
    )),

    ns_symbol: $ => choice(
      'NS_DESC_',
      'CM_',
      'BA_DEF_',
      'BA_',
      'VAL_',
      'CAT_DEF_',
      'CAT_',
      'FILTER',
      'BA_DEF_DEF_',
      'EV_DATA_',
      'ENVVAR_DATA_',
      'SGTYPE_',
      'SGTYPE_VAL_',
      'BA_DEF_SGTYPE_',
      'BA_SGTYPE_',
      'SIG_TYPE_REF_',
      'VAL_TABLE_',
      'SIG_GROUP_',
      'SIG_VALTYPE_',
      'SIGTYPE_VALTYPE_',
      'BO_TX_BU_',
      'BA_DEF_REL_',
      'BA_REL_',
      'BA_DEF_DEF_REL_',
      'BU_SG_REL_',
      'BU_EV_REL_',
      'BU_BO_REL_',
      'SG_MUL_VAL_',
    ),

    // ─── BS_  (bit timing) ──────────────────────────────────────────────────
    // BS_: [baudrate : btr1 , btr2]
    // In practice the body after ':' is nearly always empty.
    bit_timing: $ => seq(
      'BS_',
      ':',
      optional(seq(
        field('baudrate', $._uint),
        ':',
        field('btr1', $._uint),
        ',',
        field('btr2', $._uint),
      )),
    ),

    // ─── BU_  (nodes / ECUs) ────────────────────────────────────────────────
    nodes: $ => seq(
      'BU_',
      ':',
      field('nodes', alias(repeat($._node_name), $.node_list)),
    ),

    _node_name: $ => alias($.identifier, $.node_ref),

    // ─── VAL_TABLE_  (global value tables) ──────────────────────────────────
    // VAL_TABLE_ <name> <int> "<label>" <int> "<label>" ... ;
    value_table: $ => seq(
      'VAL_TABLE_',
      field('name', $.identifier),
      repeat($.value_description),
      ';',
    ),

    value_description: $ => seq(
      field('value', $._signed_int),
      field('label', $.string),
    ),

    // ─── BO_  (messages / frames) ───────────────────────────────────────────
    // BO_ <id> <name>: <dlc> <transmitter>
    //   SG_ ...
    //   SG_ ...
    message: $ => seq(
      'BO_',
      field('id', $._uint),
      field('name', $.identifier),
      ':',
      field('dlc', $._uint),
      field('transmitter', alias($.identifier, $.node_ref)),
      repeat($.signal),
    ),

    // ─── SG_  (signals) ─────────────────────────────────────────────────────
    // SG_ <name> [mux] : <start>|<len>@<byte_order><value_type>
    //     (<factor>,<offset>) [<min>|<max>] "<unit>" <receivers>
    signal: $ => seq(
      'SG_',
      field('name', $.identifier),
      optional(field('mux', $.mux_indicator)),
      ':',
      field('start_bit', $._uint),
      '|',
      field('length', $._uint),
      '@',
      field('byte_order', alias(token(/[01]/), $.byte_order)),
      field('value_type', alias(token(/[+-]/), $.value_type)),
      '(',
      field('factor', $._number),
      ',',
      field('offset', $._number),
      ')',
      '[',
      field('minimum', $._number),
      '|',
      field('maximum', $._number),
      ']',
      field('unit', $.string),
      field('receivers', $.receiver_list),
    ),

    // M         : multiplexor switch
    // m<N>      : multiplexed signal (mux value N)
    // m<N>M     : multiplexed multiplexor (extended multiplexing)
    mux_indicator: $ => choice(
      token('M'),
      token(/m\d+M?/),
    ),

    receiver_list: $ => seq(
      alias($.identifier, $.node_ref),
      repeat(seq(',', alias($.identifier, $.node_ref))),
    ),

    // ─── BO_TX_BU_  (message transmitters) ──────────────────────────────────
    // BO_TX_BU_ <msg_id> : <node>, <node>, ... ;
    message_transmitters: $ => seq(
      'BO_TX_BU_',
      field('message_id', $._uint),
      ':',
      alias($.identifier, $.node_ref),
      repeat(seq(',', alias($.identifier, $.node_ref))),
      ';',
    ),

    // ─── EV_  (environment variables) ───────────────────────────────────────
    // EV_ <name>: <type> [<min>|<max>] "<unit>" <init> <ev_id>
    //     <access_type> <access_node>, ... ;
    environment_variable: $ => seq(
      'EV_',
      field('name', $.identifier),
      ':',
      field('ev_type', $._uint),
      '[',
      field('minimum', $._number),
      '|',
      field('maximum', $._number),
      ']',
      field('unit', $.string),
      field('initial_value', $._number),
      field('ev_id', $._uint),
      field('access_type', $.identifier),
      field('access_nodes', seq(
        alias($.identifier, $.node_ref),
        repeat(seq(',', alias($.identifier, $.node_ref))),
      )),
      ';',
    ),

    // ENVVAR_DATA_ <name> : <data_size>;
    environment_variable_data: $ => seq(
      'ENVVAR_DATA_',
      field('name', $.identifier),
      ':',
      field('data_size', $._uint),
      ';',
    ),

    // ─── SGTYPE_  (signal types – rarely used) ──────────────────────────────
    // Two forms:
    //   SGTYPE_ <name> : <size>@<order><type> (<factor>,<offset>)
    //                    [<min>|<max>] "<unit>" <default>, <val_table>;
    //   SGTYPE_ <msg_id> <sig_name> : <sgtype_name>;
    signal_type: $ => seq(
      'SGTYPE_',
      field('name', $.identifier),
      ':',
      field('size', $._uint),
      '@',
      field('byte_order', alias(token(/[01]/), $.byte_order)),
      field('value_type', alias(token(/[+-]/), $.value_type)),
      '(',
      field('factor', $._number),
      ',',
      field('offset', $._number),
      ')',
      '[',
      field('minimum', $._number),
      '|',
      field('maximum', $._number),
      ']',
      field('unit', $.string),
      field('default', $._number),
      ',',
      field('value_table', $.identifier),
      ';',
    ),

    signal_type_ref: $ => seq(
      'SGTYPE_',
      field('message_id', $._uint),
      field('signal_name', $.identifier),
      ':',
      field('sgtype_name', $.identifier),
      ';',
    ),

    // ─── CM_  (comments on nodes, messages, signals, env vars) ──────────────
    // CM_ "<text>" ;
    // CM_ BU_ <node> "<text>" ;
    // CM_ BO_ <id> "<text>" ;
    // CM_ SG_ <id> <sig> "<text>" ;
    // CM_ EV_ <name> "<text>" ;
    comment: $ => seq(
      'CM_',
      optional(choice(
        seq(
          alias('BU_', $.object_kind),
          field('object', alias($.identifier, $.node_ref)),
        ),
        seq(
          alias('BO_', $.object_kind),
          field('message_id', $._uint),
        ),
        seq(
          alias('SG_', $.object_kind),
          field('message_id', $._uint),
          field('signal_name', $.identifier),
        ),
        seq(
          alias('EV_', $.object_kind),
          field('env_var', $.identifier),
        ),
      )),
      field('text', $.string),
      ';',
    ),

    // ─── BA_DEF_  (attribute definitions) ───────────────────────────────────
    // BA_DEF_ [BU_|BO_|SG_|EV_] "<name>" <type_specifier> ;
    attribute_definition: $ => seq(
      'BA_DEF_',
      optional(field('object_kind', $._attr_object_kind)),
      field('name', $.string),
      field('type', $.attr_type),
      ';',
    ),

    // BA_DEF_REL_ <rel_kind> "<name>" <type_specifier> ;
    attribute_definition_rel: $ => seq(
      'BA_DEF_REL_',
      field('rel_kind', $._attr_rel_kind),
      field('name', $.string),
      field('type', $.attr_type),
      ';',
    ),

    _attr_object_kind: $ => choice(
      alias('BU_', $.object_kind),
      alias('BO_', $.object_kind),
      alias('SG_', $.object_kind),
      alias('EV_', $.object_kind),
    ),

    _attr_rel_kind: $ => choice(
      alias('BU_SG_REL_', $.rel_kind),
      alias('BU_BO_REL_', $.rel_kind),
      alias('BU_EV_REL_', $.rel_kind),
    ),

    attr_type: $ => choice(
      seq(
        alias('INT', $.attr_type_name),
        field('min', $._signed_int),
        field('max', $._signed_int),
      ),
      seq(
        alias('HEX', $.attr_type_name),
        field('min', $._signed_int),
        field('max', $._signed_int),
      ),
      seq(
        alias('FLOAT', $.attr_type_name),
        field('min', $._number),
        field('max', $._number),
      ),
      alias('STRING', $.attr_type_name),
      seq(
        alias('ENUM', $.attr_type_name),
        optional(seq(
          $.string,
          repeat(seq(',', $.string)),
        )),
      ),
    ),

    // BA_DEF_DEF_ "<name>" <default> ;
    attribute_default: $ => seq(
      'BA_DEF_DEF_',
      field('name', $.string),
      field('default', $._attr_value),
      ';',
    ),

    attribute_default_rel: $ => seq(
      'BA_DEF_DEF_REL_',
      field('name', $.string),
      field('default', $._attr_value),
      ';',
    ),

    // BA_ "<name>" [object_ref] <value> ;
    attribute_value: $ => seq(
      'BA_',
      field('name', $.string),
      optional(field('object', $._attr_object_ref)),
      field('value', $._attr_value),
      ';',
    ),

    attribute_value_rel: $ => seq(
      'BA_REL_',
      field('name', $.string),
      field('object', $._attr_rel_object_ref),
      field('value', $._attr_value),
      ';',
    ),

    _attr_object_ref: $ => choice(
      seq(alias('BU_', $.object_kind), alias($.identifier, $.node_ref)),
      seq(alias('BO_', $.object_kind), $._uint),
      seq(alias('SG_', $.object_kind), $._uint, $.identifier),
      seq(alias('EV_', $.object_kind), $.identifier),
    ),

    _attr_rel_object_ref: $ => choice(
      seq(
        alias('BU_SG_REL_', $.rel_kind),
        alias($.identifier, $.node_ref),
        'SG_',
        $._uint,
        $.identifier,
      ),
      seq(
        alias('BU_BO_REL_', $.rel_kind),
        alias($.identifier, $.node_ref),
        'BO_',
        $._uint,
      ),
      seq(
        alias('BU_EV_REL_', $.rel_kind),
        alias($.identifier, $.node_ref),
        'EV_',
        $.identifier,
      ),
    ),

    _attr_value: $ => choice(
      $.string,
      $._number,
    ),

    // ─── VAL_  (value tables for signals and env vars) ──────────────────────
    // VAL_ <msg_id> <sig_name>  <int> "<label>" ... ;
    // VAL_ <env_var_name>       <int> "<label>" ... ;
    value_definitions: $ => choice(
      seq(
        'VAL_',
        field('message_id', $._uint),
        field('signal_name', $.identifier),
        repeat($.value_description),
        ';',
      ),
      seq(
        'VAL_',
        field('env_var', $.identifier),
        repeat($.value_description),
        ';',
      ),
    ),

    // ─── SIG_GROUP_  (signal groups) ────────────────────────────────────────
    // SIG_GROUP_ <msg_id> <name> <repetitions> : <sig> <sig> ... ;
    signal_group: $ => seq(
      'SIG_GROUP_',
      field('message_id', $._uint),
      field('name', $.identifier),
      field('repetitions', $._uint),
      ':',
      repeat($.identifier),
      ';',
    ),

    // ─── SIG_VALTYPE_  (extended value type) ────────────────────────────────
    // 0 = integer, 1 = float, 2 = double
    // Some producers emit a colon; others don't.
    signal_extended_value_type: $ => seq(
      'SIG_VALTYPE_',
      field('message_id', $._uint),
      field('signal_name', $.identifier),
      optional(':'),
      field('value_type', $._uint),
      ';',
    ),

    // ─── SG_MUL_VAL_  (extended multiplexing) ───────────────────────────────
    // SG_MUL_VAL_ <msg_id> <mux_sig> <switch_sig>
    //             <from>-<to>, <from>-<to>, ... ;
    signal_multiplexed_value: $ => seq(
      'SG_MUL_VAL_',
      field('message_id', $._uint),
      field('multiplexed_signal', $.identifier),
      field('multiplexor_switch', $.identifier),
      $.mux_range,
      repeat(seq(',', $.mux_range)),
      ';',
    ),

    mux_range: $ => seq(
      field('from', $._uint),
      '-',
      field('to', $._uint),
    ),

    // ─── Terminals ──────────────────────────────────────────────────────────
    identifier: $ => /[A-Za-z_][A-Za-z0-9_]*/,

    _uint:       $ => alias(token(/\d+/), $.integer),
    _signed_int: $ => alias(token(/-?\d+/), $.integer),
    _number:     $ => alias(
      token(/[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/),
      $.number,
    ),

    // DBC strings are double-quoted. The format has no officially specified
    // escape syntax, but several tools emit backslash escapes, so we accept
    // them without prescribing their meaning.
    string: $ => token(seq(
      '"',
      repeat(choice(
        /[^"\\]/,
        /\\./,
      )),
      '"',
    )),

    // Non-standard line comment — tolerated because several vendor tools emit
    // them and stripping them manually is a pain. Parsed as whitespace.
    line_comment: $ => token(seq('//', /.*/)),
  },
});
