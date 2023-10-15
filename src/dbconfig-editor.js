// ==ClosureCompiler==
// @compilation_level SIMPLE_OPTIMIZATIONS
// @output_file_name default.js
// @language_out ECMASCRIPT_2017
// ==/ClosureCompiler==



// namespace
window.nettools = window['nettools'] || {};










nettools.DbConfigEditor = class {
	
	/**
	 * Constructor for db config editor
     *
     * `options` argument may define the following properties :
     *   - metadataColum : string ; set the name of metadata column (by default, this is set to 'metadata')
     *   - valueColumn : string ; set the name of value column (by default, this is set to 'value')
     *   - primaryKeyColumn : string ; set the name of primary key column for config table (by default, this is set to 'key')
	 *   - defaultSeparator : string ; set the default separator for list of values (by default, this is set to ';')
	 *   - lineLength : int ; the maximum allowed characters when displaying value. If the value exceeds `linelength`, it's truncated only for display
	 *   - dialogObject : object ; a reference to nettools.ui.desktop.dialog (may be used inside an iframe to display the dialog OUTSIDE the iframe by setting this property to parent.nettools.ui.desktop.dialog, for example)
	 *
	 * `metadata` column value is a JSON encoded object with the properties below :
	 *   - type : string ; value type (text, numeric, bool, list, longtext, html)
	 *   - required : bool ; 1 if value is mandatory, 0 otherwise
	 *   - hint : string ; a tooltip string to display help message about value
	 *   - separator : string ; a string defining separator character for a list of values
	 *   - list : string ; the key of another row in table containing in the 'value' column all available choices for the list (with `separator` character to split values)
	 *   - values : string ; a string with all available choices for the list (with `separator` character to split values)
	 *
	 * @param string tableName Name of config table
	 * @param HTMLElement node Top container for db config editor GUI
     * @param object options Object litteral with options for DbConfigEditor class 
	 * @param function editorClass Constructor for editor class (inheriting from nettools.SQLTableEditor) ; use `.bind` to assign parameters not declared in nettools.SQLTableEditor constructor
	 * @param object editorClassOptions Miscellaneous parameters (passed to `editorClass` constructor as last argument)
	 */
	constructor(tableName, node, options = {}, editorClass = nettools.jsGridEditor, editorClassOptions = {})
	{
		this.table = tableName;
		this.sqlEditorClass = editorClass;
		this.sqlEditorClassOptions = editorClassOptions;
		this.node = node;
		this.options = options;
		this.headerNode = null;
		this.sqlEditor = null;
		this.sqlEditorNode = null;
        
        
        // set default values
        this.setDefaultValues();
        
        
		
		var that = this;
		
		// set underlying grid editor options
        this.sqlEditorClassOptions.gridEditorClassOptions = {
			
			// get html content for metadata or value column
			onCellHtml : function(...args){
				// call DbConfigEditor.cellHtmlEvent as an event handler of underlying jsGridEditor object (this refers to jsGridEditor) ; first arg = that = DbConfigEditor object
				return that.cellHtmlEvent.apply(this, [that].concat(args));
			},
            
            
            // get value for cell with html content
            onGetCellHtmlValue : function(...args){
				// call DbConfigEditor.getCellHtmlValue as an event handler of underlying jsGridEditor object (this refers to jsGridEditor) ; first arg = that = DbConfigEditor object
				return that.cellHtmlValueEvent.apply(this, [that].concat(args));
            },
						
			// validate row
			onRowValidate : this.validateEvent.bind(this),
			
			// default value for metadata column
			defaultValues : {}
		};
		
		this.sqlEditorClassOptions.gridEditorClassOptions.defaultValues[this.options.metadataColumn] = '{"type":"text", "required":0}';
	}
    
    
    
	/**
	 * Set parameters default values for missing ones 
	 */
	setDefaultValues()
	{
        this.options.metadataColumn = this.options.metadataColumn || 'metadata';
        this.options.valueColumn = this.options.valueColumn || 'value';
        this.options.primaryKeyColumn = this.options.primaryKeyColumn || 'key';
		this.options.defaultSeparator = this.options.defaultSeparator || ';';
		this.options.dialogObject = this.options.dialogObject || nettools.ui.desktop.dialog;
		this.options.lineLength = this.options.lineLength || 75;
	}   
	
	
	
    /**
     * Validate content for value with metadata rules ; inside method, `this` is bound to DbConfigEditor object instead of underlying jsGridEditor
     *
	 * @param int row 0-index row offset or -1 if new inserted row being validated
	 * @param object values Row values as an object litteral from contentEditable cells
	 * @return Promise Returns a resolved Promise if validation ok, or a rejected Promise with error message if validation fails
     */
    validateEvent(row, values)
    {
        // get metadata associated with value ; `this` is bound to DbConfigEditor object
        var m = JSON.parse(values[this.options.metadataColumn]);
        
        if ( m == null )
            throw new Error('Unreadble JSON metadata');
        
        
        var value = values[this.options.valueColumn];
        
        
        // if value required
        if ( m.required && (value == '') )
            return Promise.reject(nettools.DbConfigEditor.i18n.REQUIRED.replace(/%/, this.options.valueColumn));
        
        
        // check with value type
        switch ( m.type )
        {
            case 'numeric':
                 if ( !value.match(/^[0-9]*[0-9](\.[0-9]+)?$/) )
                    return Promise.reject(nettools.DbConfigEditor.i18n.NUMERIC_VALUE.replace(/%/, this.options.valueColumn));
               
                break;
                
                
            case 'bool':
                if ( !value.match(/^[01]$/) )
                    return Promise.reject(nettools.DbConfigEditor.i18n.BOOL_VALUE.replace(/%/, this.options.valueColumn));
                
                break;
        }
        
        
        // validation OK
        return Promise.resolve();
    }
	
	
	
	/**
	 * Create HTML content for the metadata column ; `this` refers to DbConfigEditor
	 *
	 * @param int row 0-index of row that TD belongs to
	 * @param string value Cell content as stored in dataset
	 * @param HTMLTableCellElement td TD node to put content into
	 */
	editMetadata(row, value, td)
	{
		// we don't allow editing metadata if inserting a row
		if ( this.sqlEditor.editor.isInserting() )
			return;
		
		
		var that = this;
		
		var m = JSON.parse(value);
		if ( !m )
			throw new Error('Unreadable metadata JSON');
		
		
		this.options.dialogObject.dynamicForm(
			{
				// fields
				fields : {
					type : { type : 'select', value:m.type, options:['text','longtext','numeric','bool','list','html'], label:nettools.DbConfigEditor.i18n.METADATA_VALUE_TYPE },
					required : { type : 'radio', value:m.required, label:'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + nettools.DbConfigEditor.i18n.METADATA_REQUIRED, 
										items:[	{name:'ryes', value:1, checked:m.required, label:nettools.DbConfigEditor.i18n.METADATA_REQUIRED_YES}, 
												{name:'rno', value:0, checked:!m.required, label:nettools.DbConfigEditor.i18n.METADATA_REQUIRED_NO} ] },
					hint : { type : 'text', value:m.hint || '', newLineBefore:true, label:nettools.DbConfigEditor.i18n.METADATA_HINT },
					separator : { type : 'text', value:m.separator || this.options.defaultSeparator, newLineBefore:true, label:nettools.DbConfigEditor.i18n.METADATA_SEPARATOR },
					list : { type : 'text', value:m.list || '', newLineBefore:true, label:nettools.DbConfigEditor.i18n.METADATA_LIST},
					values : { type : 'textarea', value:m.values || '', newLineBefore:true, newLineAfterLabel:true, label:nettools.DbConfigEditor.i18n.METADATA_VALUES}
				},
				
				
				// required
				required: ['type'],
				
				
				// onsubmit -> Promise
				onsubmitpromise : function(elements)
				{
					// if type = list
					if ( elements.type.value == 'list' )
					{
						// 'list' or 'values' fields are mandatory
						if ( (elements.list.value == '') && (elements.values.value == '') )
							return Promise.reject({ status:false, message:nettools.DbConfigEditor.i18n.METADATA_SUBMIT_LIST, field:elements.list});
												
						// checking separator is set
						if ( elements.separator.value == '' )
							return Promise.reject({ status:false, message:nettools.DbConfigEditor.i18n.METADATA_SUBMIT_SEPARATOR, field:elements.separator});
					}
					
					
					return Promise.resolve({status:true});
				},
				
				
				// submit handler
				submit : new nettools.jscore.SubmitHandlers.Callback({
					target : function(form, elements)
						{
							// build object litteral for metadata
							var o = {
								type : elements.type.value,
								required : (elements.required.value == '1') ? 1 : 0
							};					
							
							['hint', 'separator', 'list', 'values'].forEach(function(p){
								if ( elements[p].value )
									o[p] = elements[p].value;
							});
							
							
							var json = JSON.stringify(o);
							
							
							// store metadata in db
							that.sqlEditor.SQL(`UPDATE ${that.table} SET ${that.options.metadataColumn} = ? WHERE ${that.options.primaryKeyColumn} = ?`, [json, that.sqlEditor.editor.options.data[row][that.options.primaryKeyColumn]])
								.then(function(){
									// update grid data, easier that reloading full dataset from db
									that.sqlEditor.editor.options.data[row][that.options.metadataColumn] = json;
									
									// repaint cell
									that.cellHtmlEvent_metadataColumn(that, false, row, that.options.metadataColumn, json, td);
								})
								.catch(function(e){
									that.sqlEditor.editor.options.dialog.alert(e.message ? e.message : e);
								});
						}
				})
			},
		
		
			'dbConfigMetadata', undefined, this.options.dialogObject.ALIGN_TOP
		);
	}
    
    
    
	/**
	 * Get value for html cell in edit mode ; `this` refers to event caller jsGridEditor
	 *
	 * @param nettools.DbConfigEditor dbConfigEditor Editor object
	 * @param int row 0-index of row that the TD belongs to
	 * @param string column Column name
	 * @param HTMLTableCellElement td TD node to read content from
	 * @return string
	 */
    cellHtmlValueEvent(dbConfigEditor, row, column, td)
    {
		var m ;
		
		
		// if handling value column
        if ( column == dbConfigEditor.options.valueColumn )
        {
			// if new line, get data from default values
			if ( row === undefined )
				m = JSON.parse(this.options.defaultValues[dbConfigEditor.options.metadataColumn]);
			else
				// get metadata associated to this column value
				m = JSON.parse(this.options.data[row][dbConfigEditor.options.metadataColumn]);
			
			
            if ( !m )
                throw new Error('Unreadable metadata');
            
			
            switch ( m.type )
            {
                case 'bool': 
                    return td.querySelector('input[value="1"]').checked ? '1' : '0';  
                    
                
                case 'list':
                    return td.querySelector('select').value; 
					
					
				case 'longtext':
				case 'html':
					return td.firstChild.getAttribute('data-value');
                    
                    
                default:
                    return td.innerText;
            }
        }
            
		
		// if metadata column (not editable)
		else if ( column == dbConfigEditor.options.metadataColumn )
		{
			if ( row === undefined )
				return this.options.defaultValues[dbConfigEditor.options.metadataColumn];
			else
				return this.options.data[row][column];
		}
        
		
		// else return dataset value
        else
            return this.options.data[row][column];
    }
	
	
	
	/**
	 * Create HTML content for the metadata column ; `this` refers to event caller jsGridEditor
	 *
	 * @param nettools.DbConfigEditor dbConfigEditor Editor object
	 * @param bool editing True if line is being edited
	 * @param int row 0-index of row that TD belongs to
	 * @param string column Column name
	 * @param string value Cell content as stored in dataset
	 * @param HTMLTableCellElement td TD node to put content into
	 */
	cellHtmlEvent_metadataColumn(dbConfigEditor, editing, row, column, value, td)
	{
		var m;
		
		
		// transform json-encoded string to object
		m = JSON.parse(value);
		if ( !m )
			return '<span style="color:red;">ERR</span>';


		var src = nettools.DbConfigEditor.Resources[m.type.toUpperCase() + '_VALUE'];
		if ( src )
			td.innerHTML = `<img src="${src}">`;
		else
			td.innerHTML = 'type ?';


		// set CSS for metadata column and icon for value type
		td.className = 'metadata';
		
		var img = td.querySelector('img');
		if ( img )
		{
			if ( !editing )
				img.onclick = dbConfigEditor.editMetadata.bind(dbConfigEditor, row, value, td);
			else
				img.style.cursor = 'auto';
			
			if ( m.required )
				img.classList.add('required');
		}


		// set hint 
		td.title = 	[
						`${nettools.DbConfigEditor.i18n.METADATA_VALUE_TYPE} : ${m.type}`, 
						`${nettools.DbConfigEditor.i18n.METADATA_REQUIRED} : ${m.required ? nettools.DbConfigEditor.i18n.METADATA_REQUIRED_YES:nettools.DbConfigEditor.i18n.METADATA_REQUIRED_NO}`,
						m.separator ? `${nettools.DbConfigEditor.i18n.METADATA_SEPARATOR} : '${m.separator}'` : null,
						m.list ? `${nettools.DbConfigEditor.i18n.METADATA_LIST} : '${m.list}'` : null,
						m.values ? `${nettools.DbConfigEditor.i18n.METADATA_VALUES} : (...)` : null, 
						m.hint ? `${nettools.DbConfigEditor.i18n.METADATA_HINT} : ${m.hint}` : null
					].filter(x => x).join('\n');			// removing empty array values before joining
	}
	
	
	
	/**
	 * Create HTML content for the value column ; `this` refers to event caller jsGridEditor
	 *
	 * @param nettools.DbConfigEditor dbConfigEditor Editor object
	 * @param bool editing True if line is being edited
	 * @param int row 0-index of row that TD belongs to
	 * @param string column Column name
	 * @param string value Cell content as stored in dataset
	 * @param HTMLTableCellElement td TD node to put content into
	 */
	cellHtmlEvent_valueColumn(dbConfigEditor, editing, row, column, value, td)
	{
		var m;
		
		
		if ( row === undefined )
			m = JSON.parse(this.options.defaultValues[dbConfigEditor.options.metadataColumn]);
		else
			// get metadata associated to this column value
			m = JSON.parse(this.options.data[row][dbConfigEditor.options.metadataColumn]);


		if ( !m )
		{
			td.innerHTML = "/!\\ Unreadable metadata";
			return;
		}
		
		
		// set tooltip
		if ( m.hint )
			td.title = m.hint;


		// if edit mode
		if ( editing )
		{
			// by default, value edit is disabled ; will be authorized only if value type is either text ou numeric
			td.contentEditable = ( (m.type == 'text') || (m.type == 'numeric') ) ? 'true' : false;


			switch ( m.type )
			{
				case "bool": 
					td.innerHTML =  `<label><input type="radio" name="boolvalue${row}" value="1"><span class="bool1" title="1">✔</span></label>` +
									`&nbsp;&nbsp;<label><input type="radio" name="boolvalue${row}" value="0"><span class="bool0" title="0">✘</span></label>`;

					if ( value == '1' )
						td.querySelector('input[value="1"]').checked = true;
					else
						td.querySelector('input[value="0"]').checked = true;

					break;


				case "list":
					var values;


					// if list of values is in another row, 'list' property is defined as target key
					if ( m.list )
					{
						// looking for a line with PK=metadata.list 
						var tabl = this.options.data.length;
						for ( var i = 0 ; i < tabl ; i++ )
							// if found target line
							if ( this.options.data[i][dbConfigEditor.options.primaryKeyColumn] == m.list )
							{
								// get list of values with appropriate separator
								values = this.options.data[i][dbConfigEditor.options.valueColumn];
								break;
							}
					}


					// otherwise, list of values is defined in 'values' property
					else if ( m.values )
						values = m.values;

					else 
						values = '';


					if ( values === undefined )
						throw new Error(`No values found at row with key '${m.list}'`);
					else
					if ( values != '' )
						// get array of values
						values = values.split(m.separator || dbConfigEditor.options.defaultSeparator).map(function(v){ return `<option>${v}</option>`; }).join('\n');


					// create list and define current value as selected
					td.innerHTML = `<select name="select${row}"><option></option>${values}</select>`;
					td.querySelector('select').value = value;

					break;


				case 'longtext':
				case 'html':
					td.innerHTML = `<input type="button" value="${nettools.DbConfigEditor.i18n.EDIT}">`;

					var btn = td.firstChild;
					btn.setAttribute('data-value', value);
					btn.onclick = function()
						{
							var that = this;
							var p;
						
						
							// textarea edit or tinymce
							if ( m.type == 'longtext')
								// lib, defvalue, textarea, textareacssclass
								p = dbConfigEditor.options.dialogObject.promptPromise('', this.getAttribute('data-value'), true);
							else
								// lib, defvalue, textarea, textareacssclass
								p = dbConfigEditor.options.dialogObject.richEditPromise(this.getAttribute('data-value'));
						
						
							// get new value or user canceled dialog
							p.then(function(newValue)
								{
									that.setAttribute('data-value', newValue);

									if ( (value != newValue) && !that.parentNode.querySelector('em') )
									{
										var em = document.createElement('em');
										em.innerText = nettools.DbConfigEditor.i18n.EDIT_DIRTY;
										that.parentNode.appendChild(em);
									}
								}
							)
							.catch(function(e)
								{
									// catch errors, but ignore user canceling dialog
									if ( (typeof e === 'object') && (e instanceof Error) )
										dbConfigEditor.sqlEditor.editor.options.dialog.alert(e.message);
								}
							);
						};

					break;


				default:
					td.innerText = (value === undefined) ? '' : value;
					break;
			}
		}


		// otherwise, if no edit mode, display regular content
		else
		{
			// special case with bool values
			switch ( m.type )
			{
				case 'bool':
					td.innerHTML = (value=='1' ? "<span class=\"bool1\" title=\"1\">✔</span>" : '<span class=\"bool0\" title=\"0\">✘</span>');
					break;


				case 'longtext':
				case 'html':
					// only display first 50 characters, and no new lines
					td.innerText = value.substr(0, dbConfigEditor.options.lineLength).replace(/\r?\n/g, '¶');
					if ( value.length > dbConfigEditor.options.lineLength )
						td.innerHTML += '<abbr>(⋯)</abbr>';	
		
					break;

				default:
					td.innerText = value;
					break;
			}
		}
		
	}
	
	
		
	/**
	 * Create HTML content for the metadata or value column ; `this` refers to event caller jsGridEditor
	 *
	 * @param nettools.DbConfigEditor dbConfigEditor Editor object
	 * @param bool editing True if line is being edited
	 * @param int row 0-index of row that TD belongs to
	 * @param string column Column name
	 * @param string value Cell content as stored in dataset
	 * @param HTMLTableCellElement td TD node to put content into
	 */
	cellHtmlEvent(dbConfigEditor, editing, row, column, value, td)
	{
		// if handling metadata column
		if ( column == dbConfigEditor.options.metadataColumn )
			return dbConfigEditor.cellHtmlEvent_metadataColumn.call(this, dbConfigEditor, editing, row, column, value, td);
		

		// if handling value column
		else if ( column == dbConfigEditor.options.valueColumn )
			return dbConfigEditor.cellHtmlEvent_valueColumn.call(this, dbConfigEditor, editing, row, column, value, td);
	}
    
    
    
    /**
     * Prepare db config editor and output GUI
     * 
     * @return Promise Returns a Promise resolved when data is ready
     */
    setup()
    {
        return this.refresh();
    }
    
    

	/**
	 * Apply CSS on created tags
	 */
	applyCSS()
	{
		this.node.classList.add('jsDbConfigEditor');		
	}
	

	
	/**
	 * Display GUI for db config editor
     *
     * @return Promise Returns a resolved Promise when data is ready
	 */
	refresh()
	{
		// create GUI content
		this.node.innerHTML = 
`<div class="uiForm dbConfig">
	<a href="javascript:void(0)">${nettools.DbConfigEditor.i18n.TABLE_RELOAD}</a><span>-</Span> 
</div>
<div></div>`;
		
		
		// set event for reload link
		this.node.querySelector('div.dbConfig > a').onclick = this.refresh.bind(this);
		
		
		// set target node for editor and header
		this.headerNode = this.node.querySelector('div.dbConfig');
		this.sqlEditorNode = this.node.querySelector('div:nth-of-type(2)');
		
		
		// apply css format
		this.applyCSS();
		
		
		// render GUI editor and then handle listboxes for list values
		return this.createEditor()
			.then(this.getListboxes.bind(this))
			.then(this.outputListboxes.bind(this));
	}
	
	
	
	/**
	 * Get a list of rows for values with metadata type = 'list'
	 * 
	 * @return Promise Returns a Promise resolved with rows with metadata type = 'list'
	 */
	getListboxes()
	{
		// now look for metadata columns
		return this.sqlEditor.SQLSelect(`SELECT ${this.options.primaryKeyColumn}, ${this.options.metadataColumn}, ${this.options.valueColumn} FROM ${this.table} WHERE ${this.options.metadataColumn} LIKE "%""list""%" ORDER BY ${this.options.primaryKeyColumn}`);
	}
    
    
    
	/**
	 * Output quick select listboxes
	 *
	 * @param object[] rows Array of object litterals containing all lines with metadata column type='list'
	 * @return Promise Returns a Promise resolved when all GUI is ready
	 */
	outputListboxes(rows)
	{
		var that = this;
		var pr = [];
		
				
		rows.forEach(function(row){
			// add a Promise to array
			pr.push(new Promise(function(resolve, reject){
				// transform json-encoded string to object
				var m = JSON.parse(row[that.options.metadataColumn]);
				
				// if no readable metadata
				if ( !m )
					reject(new Error(`Unreadable metadata for row with key '${row[that.options.primaryKeyColumn]}'`));

				if ( m.type != 'list' )
					resolve();


				// get separator
				var s = m.separator || that.options.defaultSeparator;

				// get values as a list
				if ( m.values )
					return that.outputListbox(m.values.split(s), row[that.options.primaryKeyColumn], m.hint || '', m.required, row[that.options.valueColumn]);

				// get values in another row value
				else if ( m.list )
				{
					that.sqlEditor.SQLSelect(`SELECT ${that.options.valueColumn} FROM ${that.table} WHERE ${that.options.primaryKeyColumn} = ?`, [m.list])
						.then(function(rows){
							// if target row not found, this is an error
							if ( !rows.length )
								reject(new Error(nettools.DbConfigEditor.i18n.NO_ROW_WITH_KEY.replace(/%/, m.list)));

						
							// if value empty, list of choices is empty, this is not an error
							var value = rows[0][that.options.valueColumn];
							if ( !value )
								resolve();

							return that.outputListbox(value.split(s), row[that.options.primaryKeyColumn], m.hint || '', m.required, row[that.options.valueColumn]);
						})
						.catch(reject);
				}				
				
			}));
		});
		
		
		return Promise.all(pr);
	}
    
    
    
	/**
	 * Output 1 listbox
	 *
	 * @param string[] values List of values
	 * @param string id Row id
	 * @param string hint Tooltip for value
	 * @param bool required Is the value required ?
	 * @param string value Selected value at the moment
	 * @return Promise Returns a resolved Promise when done
	 */
	outputListbox(values, id, hint, required, value)
	{
		var lst = `<label>${id} <select title="${hint}" name="${id}" data-required="${required ? 1 : 0}"><option></option>${values.map(x => '<option>' + x + '</option>').join('')}</select></label>`;
		this.headerNode.insertAdjacentHTML('beforeend', lst);
		
		
		// get select node
		var sel = this.headerNode.querySelector('label:last-child select');
		sel.value = value;
		sel.onchange = this.listboxChange.bind(this);
		sel.onclick = function(){
			this.setAttribute('data-old', this.value);
		};		
		
		return Promise.resolve();
	}
	
	
	
	/**
	 * React to listbox change ; 'this' refers to DbConfigEditor, not select node that triggered the event
	 *
	 * @param Event event
	 */
	listboxChange(event)
	{
		// if value can't be blank
		if ( (event.target.getAttribute('data-required') == '1') && (event.target.value == '') )
		{
			this.sqlEditor.editor.options.dialog.alert(nettools.DbConfigEditor.i18n.SELECTION_REQUIRED.replace(/%/, event.target.name));
			
			// use previously stored old selection to revert change
			event.target.value = event.target.getAttribute('data-old');
			return;
		}
			

		var that = this;
		this.sqlEditor.SQL(`UPDATE ${this.table} SET ${this.options.valueColumn} = ? WHERE ${this.options.primaryKeyColumn} = ?`, [event.target.value, event.target.name])
			.then(function(){
				// reload UI
				that.refresh();
			})
			.catch(function(e){
				that.sqlEditor.editor.options.dialog.alert(e.message ? e.message : e);
			});
	}
    
    
    
	/**
	 * Create SQL editor
     *
     * @return Promise Returns a resolved Promise when data is ready
	 */
	createEditor()
	{
        var that = this;
        
		var o = {
			
			// customize grid column data to set metadata column readonly and with type = 'html'
			onSetupGridColumns : function(columns)
				{
					columns.forEach(function(c){
						if ( c.id == that.options.metadataColumn )
						{
							c.readonly = true;
							c.type = 'html';
						}
						
						else if ( c.id == that.options.valueColumn )
						{
							c.type = 'html';
						}
					});
				}
			
		};
		
		o = Object.assign(o, this.sqlEditorClassOptions);

		
		// create SQLTableEditor with appropriate class and options
		this.sqlEditor = new this.sqlEditorClass(this.sqlEditorNode, this.table, o);
        
        
        // prepare editor and get a resolved Promise when done
        return this.sqlEditor.setup();
	}
	
}





nettools.DbConfigEditor.Resources = {
	TEXT_VALUE : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo4RDlERTExRTkyQjRFMjExQjBGNUM0NDYyRTM1MDBEOSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDoyQkU4MjQyMkI0OTIxMUUyQjQzQkZEOEMzMzNGQ0U1NCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDoyQkU4MjQyMUI0OTIxMUUyQjQzQkZEOEMzMzNGQ0U1NCIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjhFOURFMTFFOTJCNEUyMTFCMEY1QzQ0NjJFMzUwMEQ5IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjhEOURFMTFFOTJCNEUyMTFCMEY1QzQ0NjJFMzUwMEQ5Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+nzLfowAAAGBQTFRFq6ury8vLoqKiqqqq19fXmJiYxsbGtra2sLCwvb29wsLCWFhYYWFhaGhodXV1ioqKg4ODfX19b29vXFxcj4+PlJSU4+Pj9/f36enp8PDw3t7e/Pz8jIyMysrKRERE////GC0aSwAAACB0Uk5T/////////////////////////////////////////wBcXBvtAAAAdUlEQVR42nyPxw7DMAxD2STN7B4aHsr//2Vjo4DhFOgjqIPAA4l1B34fh+OmOvGuEgjhFQpA49zVZSydBiPRjcjMsmnEIHIXETNJkgGT6kXVvtIJM/ODeYtn84ze+7Mv9OhiPMVCl4o96+rtgqX9O27HR4ABAM1UGh0VwqVBAAAAAElFTkSuQmCC',
	NUMERIC_VALUE : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo4RDlERTExRTkyQjRFMjExQjBGNUM0NDYyRTM1MDBEOSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDozRTIzOTM1MUI0OTIxMUUyQUNBQUQ2MTVFOEJBNDA3NSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDozRTIzOTM1MEI0OTIxMUUyQUNBQUQ2MTVFOEJBNDA3NSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjhFOURFMTFFOTJCNEUyMTFCMEY1QzQ0NjJFMzUwMEQ5IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjhEOURFMTFFOTJCNEUyMTFCMEY1QzQ0NjJFMzUwMEQ5Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+R+i+dwAAAGBQTFRFq6ury8vLoqKiqqqq19fXmJiYxsbGtra2sLCwvb29wsLCWFhYYWFhaGhodXV1ioqKg4ODfX19b29vXFxcj4+PlJSU3t7e4+Pj9/f36enp8PDw/Pz8jIyMysrKRERE////Jpw2rAAAACB0Uk5T/////////////////////////////////////////wBcXBvtAAAAdUlEQVR42nzPxw7DQAgE0HGJa5xuYBv5/78M9mW1tpQ3NzRCgO8BzoPqYikba9FAjJ+YATXRnYySqhLVGJgfzKzKW3hA79zTGd3jeoze37zRPX7EJPISo2I7RCZ0ISwh69CmdE1Zux32Lk9vZszN3+cOfgIMALqPGgLTuQ/BAAAAAElFTkSuQmCC',
	LONGTEXT_VALUE : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAYJJREFUeNqkU7GOgkAQnUUqGgIa9ZorjOAnWOgv3Adcb+46OzoK/8Da/7C0NpZWKC0UNGohqFFU3JlkCXucF5ObZPNmhtk3j9ldNhqNPgDgDV6w+/0uxVmWReC67nf2oi0WCyl2HOdLud1uyASz2YzWcrmE+XxO3YoLa9I0JZxMJoRxHIPKkwwLOp1OLq1arZbkMsbgcrnQxsFgQLjf70G9Xq9EsFqtoFarwWazoQ0Yo2HueDxCt9uFJElgOp3mpGEYkgLqZts2JU3TLA0Pc1hzPp+h2Wzm+d1uByqXRQo8z8s/CCWIaKig0WiQjzMrGs0Ak5ZlSR8Mw5B8sbFEIBSs12tpBsXumqY9V8D/iwiEgmLnYixO5akCnDoe33a7lVCoqNfr5PNTKytA1na7LXVstVpSoejc6/XIr1QqFCuHw4HhpfB9nxbOIAiCX28iIioYDoeEnIipURSpiqJAv9//8yFhzel0IhyPx4T8JqpM1/VPzvz+4mtMf5CGJP8/9hBgAJ9IURuBR2O1AAAAAElFTkSuQmCC',
	HTML_VALUE : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAbZJREFUeNqkUztrwlAUPjemHVzEB2qXFoISaLsWB6XQH9ChQ4eOgrSbm3Rx8B+4tfg/3OqqOKaLj5ZSMENAYqDGByYmNueUhqRREPrB4buPc7/73ZMTVqvVrgHgCPaAbdu++WazUaBarT5s9kS32/XNK5XKPWdZFipBq9WikCQJOp0O3eYNzDFNk7jRaBDrug68s8gwQRRF11o8Hg/YZYyBYRh0sFQqEU+nU+DX6zUJ9Pt9SCQSoKoqHcA5AtcWiwXkcjmYzWbQbDZdUVmWyQHdVigUAkUbj8fEsViMclarFaTTaXdf0zTgHVvk4ONF+LHKMae8ACdXb9Dr9VwHqVSK9rFmXlANcPHpOQ3Fog2nlyKYXyolZrNZSopGo+7BgMCvg/Ozd3iVDsE80EHXDLi4sWAwGEA4HKbY6cB5FwncPn76NrwOvE2000G73abPN5lMfIzAGiSTSRo7Xy3oAFUzmYz7XoQgCAFHiHw+T+NQKERzbj6fM2yK4XBIgX0wGo22diIyOiiXy8SOEOMVReE5jtvaB15gznK5JK7X68ROJ/IsEoncOcrHe/6N5h9Rmez/B98CDAChuWU8IiV7LAAAAABJRU5ErkJggg==',
	LIST_VALUE : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAATdJREFUeNqcUzuKhEAUfN12LhMuyN7AE3iGPcCCoexiYmY2ijcwFMFrGBoIBt7DwMzAD8PoqOuTbdlRXGUKivZ1F2X5Xkscx/kAgDc4gWEYnupxHHO4Xq/f40mkafpUm6b5Rfu+RyfwfX9+wx5R03XdosW1qipg0ybBQtO0efM/tG0Lf7VlWQJLkgSCIABMgnw8HhvyM0mSoK7rxTDLMqC8MbquHzYRzS6Xy8KiKIChM8LzvDODAK7nYLIsC6qqbka0BqUUwjDcGNCpMQSj2bYN9/t9l6jhCTjnBNMhwQfLsl77BEwQxzGcBU+yGGACRVE2zmsIggBRFAHXYj33oGmauQeGYcDtdtslarDRXPt7PwjL85xhh13XPZwCGnEtrtNNZEQUxc/J+f3k39itTDNydP+P8CPAAATJTvWIulOqAAAAAElFTkSuQmCC',
    BOOL_VALUE : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo4RDlERTExRTkyQjRFMjExQjBGNUM0NDYyRTM1MDBEOSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo1RDkwQjA4RjgxMEUxMUUzQTMyODg2NUUyQjJFOTYxMSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo1RDkwQjA4RTgxMEUxMUUzQTMyODg2NUUyQjJFOTYxMSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjBDNzM1NjJEOUNCNEUyMTE4QkUxOTgyQkMxRjJEMzIxIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjhEOURFMTFFOTJCNEUyMTFCMEY1QzQ0NjJFMzUwMEQ5Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+h2+V2wAAAGBQTFRFq6ury8vLoqKiqqqq19fXmJiYxsbGtra2sLCwvb29wsLCWFhYYWFhaGhodXV1ioqKg4ODfX19b29vXFxcj4+PlJSU3t7e4+Pj9/f36enp8PDw/Pz8jIyMysrKRERE////Jpw2rAAAACB0Uk5T/////////////////////////////////////////wBcXBvtAAAAd0lEQVR42nyP2w6DQAhEp2q99qJWWfaG//+XRX3YrE16ZuCBTAhgu4Dfwe2uyhNrlkAIS0gABdGbRITocIHWmNGIam9iWjTWTlZUpxt0zr2cHHJaHXrmmXUHC7NWj9r7p0/UqGJ8xES1H/bJTy8HDOXf5y58BRgAzG0aIG5rBKgAAAAASUVORK5CYII='
}




nettools.DbConfigEditor.i18n = {
	TABLE_RELOAD : 'Reload',
    REQUIRED : '`%` column is mandatory',
    BOOL_VALUE : 'Bool value (0/1) is required for column `%`',
    NUMERIC_VALUE : 'Numeric value is required for column `%`',
	EDIT : 'Edit value',
	EDIT_DIRTY : 'Updates not saved !',
	SELECTION_REQUIRED : 'Selecting a value is mandatory for key `%`',
	NO_ROW_WITH_KEY : 'No row found with key `%`',
	
	METADATA_VALUE_TYPE : 'Value type',
	METADATA_REQUIRED : 'Required',
	METADATA_REQUIRED_YES : 'Yes',
	METADATA_REQUIRED_NO : 'No',
	METADATA_HINT : 'Tooltip hint',
	METADATA_LIST : 'Values in row w/ key',
	METADATA_VALUES : 'List of values',
	METADATA_SEPARATOR : 'Values separator char.',
	
	METADATA_SUBMIT_LIST : 'If value type = `list`, `Values in row` or `List of values` data must be set',
	METADATA_SUBMIT_SEPARATOR : 'Separator character is required if value type = `list`'
}


