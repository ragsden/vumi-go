// go.components.tables
// ========================
// Tables that are used to manage swaths of data.

(function(exports) {
  var ViewCollection = go.components.structures.ViewCollection;

  // TODO Replace with TableView once our communication with the server is more
  // api-like
  var TableFormView = Backbone.View.extend({
    defaults: {
      rowLinkAttribute: 'data-url',
      actionPrefix: '_'
    },

    templates: {
      singular: _.template(
        "Are you sure you want to <%=action%> this item?"),
      plural: _.template(
        "Are you sure you want to <%=action%> these <%=numChecked%> items?"),
    },

    initialize: function() {
      // the table is rendered elsewhere, so el is an absolute
      // requirements.
      if (!this.$el.is('form')) {
        throw("TableFormView must get an `el` attribute that's a FORM element");
      }

      _(this.options).defaults(this.defaults);
      this._initActions();
    },

    _initActions: function() {
      this.$actions = $(this.options.actions);

      var self = this;
      this.$actions.each(function() {
        var $el = $(this),
            action = $el.attr('data-action'),
            modal = $el.attr('data-target');

        if (modal) {
          // If the action is targeting a modal, we rewire the modal's form to
          // submit the action instead
          $(modal).find('form').submit(function(e) {
            e.preventDefault();
            self.submitAction(action);
          });
        } else {
          // Otherwise, if the action doesn't target any modal, we show our own
          // modal with a confirmation message
          $el.click(function() { self.confirmAction(action); });
        }
      });
    },

    $headActionMarker: function() {
      return this.$('th:first-child input');
    },

    $actionMarkers: function() {
      return this.$('td:first-child input');
    },

    allChecked: function() {
      return !this.$('td:first-child input:not(:checked)').length;
    },

    numChecked: function() {
      return this.$('td:first-child input:checked').length;
    },

    refreshButtons: function() {
      this.$actions.prop('disabled', !this.numChecked());
    },

    submitAction: function(action) {
        // add an action field to the form; the view to which this
      // submits can use this field to determine which action
      // was invoked.
      var $input = $('<input>')
        .attr('type', 'hidden')
        .attr('name', this.options.actionPrefix + action)
        .appendTo(this.$el);

      this.$el.submit();
      $input.remove();

      return this;
    },

    confirmAction: function(action) {
      var numChecked = this.numChecked();

      var template = numChecked > 1
        ? this.templates.plural
        : this.templates.singular;

      var message = template({
        action: action,
        numChecked: numChecked
      });

      bootbox.confirm(message, function(submit) {
        if (submit) { this.submitAction(action); }
      }.bind(this));

      return this;
    },

    events: {
      // select or deselect all the checkboxes based on the state of the 
      // single checkbox in the header.
      'change th:first-child input': function(e) {
        var checked = this.$headActionMarker().is(':checked');

        this.$actionMarkers().each(function() {
          $(this).prop('checked', checked);
        });

        this.refreshButtons();
      },

      'change td:first-child input': function(e) {
        this.$headActionMarker().prop('checked', this.allChecked());
        this.refreshButtons();
      },

      // the `td` that houses the checkbox is clickable, this make the
      // checkbox easier to click because it increases the target
      // area.
      'click td:first-child': function(e) {
        $(e.target).find('input')
          .prop('checked', true)
          .change();
      },

      'click tbody tr td': function(e) {
        var $el = $(e.target).parents('tr'),
            url = $el.attr(this.options.rowLinkAttribute);

        // Follow the link associated with the row
        if (typeof url !== 'undefined') { window.location = url; }
      },

      'click tbody tr td *': function(e) {
        // Prevent the column's click events from propagating to its elements
        e.stopPropagation();
      }
    }
  });

  var RowView = Backbone.View.extend({
    tagName: 'tr',

    patternMatches: function(pattern, attrName) {
      var attr = this.model.get(attrName);

      var patterns;
      if (_.isRegExp(pattern)) { patterns = [pattern]; }
      else { patterns = pattern.split(' '); }

      var i = patterns.length;
      while (i--) {
        if (attr.match(patterns[i])) { return true; }
      }

      return false;
    },

    matches: function(query) {
      return _(query || {}).every(this.patternMatches, this);
    }
  });

  var TableView = Backbone.View.extend({
    tagName: 'table',

    rowType: RowView,
    rowCollectionType: ViewCollection,

    columnTitles: [],

    initialize: function(options) {
      this.models = options.models;

      if (options.columnTitles) {
        this.columnTitles = options.columnTitles;
      }

      if (options.rowType) {
        this.rowType = options.rowType;
      }

      if (options.rowCollectionType) {
        this.rowCollectionType = options.rowCollectionType;
      }

      if (this.columnTitles.length) {
        this.$head = $('<thead>').appendTo(this.$el);

        var $tr = $('<tr>').appendTo(this.$head);
        this.columnTitles.forEach(function(title) {
          $tr.append($('<th>').text(title));
        });
      }

      this.$body = $('<tbody>').appendTo(this.$el);

      this.rows = new this.rowCollectionType({
        models: this.models,
        type: this.rowType
      });
    },

    render: function(query) {
      var rows;
      if (query) {
        rows = this.rows.where(function(row) { return row.matches(query); });
      } else {
        rows = this.rows.values();
      }

      this.$body.children().detach();

      rows.forEach(function(row) {
        row.render();
        row.$el.appendTo(this.$body);
      }, this);

      return this;
    }
  });

  _.extend(exports, {
    TableFormView: TableFormView,
    RowView: RowView,
    TableView: TableView
  });
})(go.components.tables = {});
