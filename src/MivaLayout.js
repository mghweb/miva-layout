import MivaLayoutComponentTree from './MivaLayoutComponentTree';
import MivaLayoutComponent from './MivaLayoutComponent';
import _cloneDeep from 'lodash/clonedeep';
import _pull from 'lodash/pull';
import objectHash from 'object-hash';

const defaultOptions = {
	settingsComponentCode: 'settings',
	exposeFullSettingsComponent: false,
	pullSettingsComponent: true,
	suppressWarnings: false
};

const MivaLayout = class MivaLayout {

	constructor( layout, options = {} ) {

		// validate layout object type
		if ( !Array.isArray( layout ) ) {
			throw new TypeError( '[MivaLayout] - "layout" is not an array'  );
		}

		// assign options
		this.options = Object.assign( {}, defaultOptions, options );

		// assign layout argument to private property
		this.$layout = _cloneDeep( layout );

		// create finalized components structure
		this.components = new MivaLayoutComponentTree( layout, this );

		// create flat version
		this.$components = this._createFlatComponentsList( this.components );

		// find "settings" component - remove from tree if found
		this.settings = this._findSettingsComponent( this.components );

	}

	/* ================================ Public Methods ================================ */

	createStore( defaultComponentStateData ) {

		// validate defaultComponentStateData
		let defaultComponentStateDataFactory = ( typeof defaultComponentStateData == 'function' ) ?
			defaultComponentStateData :
			() => {
				return ( typeof defaultComponentStateData == 'object') ? _cloneDeep( defaultComponentStateData ) : defaultComponentStateData;
			};

		this.store = this._createStore( defaultComponentStateDataFactory );

		return this;

	}

	mergeStore( storeObject ) {

		if ( storeObject == undefined || typeof storeObject != 'object' ) {
			return console.warn( '[MivaLayout] - "storeObject" is not an object' );
		}

		let store = {};

		for ( let componentId in this.store ) {

			let activeComponentState = this.store[ componentId ];
			let passedComponentState = storeObject[ componentId ];

			if ( passedComponentState && activeComponentState && activeComponentState.__attributes__ !== passedComponentState.__attributes__ ) {

				store[ componentId ] = Object.assign(
					{},
					passedComponentState,
					activeComponentState
				);

				continue;

			}

			store[ componentId ] = Object.assign(
				{},
				activeComponentState,
				passedComponentState
			);

		}

		this.store = _cloneDeep( store );

		return this;

	}

	getComponentState( componentId ) {

		return this.store[ componentId ];

	}

	setComponentState( componentId, componentState ) {

		return this.store[ componentId ] = componentState;

	}

	syncComponentStates( components ) {

		if ( !Array.isArray( components ) && !(components instanceof MivaLayoutComponentTree) ) {
			throw new TypeError( '[MivaLayout] - "components" is not an array or instance of "MivaLayoutComponentTree"'  );
		}

		if ( components.length == 0 ) {
			throw new Error( '[MivaLayout] - "components" does not have sufficient length' );
		}

		var keyState = this.getComponentState( components.first().id );

		for ( let component of components ) {
			
			this.setComponentState( component.id, keyState );

		}

		return this;

	}

	exportStore( pretty ) {

		return JSON.stringify( this.store, null, ( pretty ) ? '\t' : '' );

	}

	/* ================================ Private Methods ================================ */

	/**
	 * Create a "flat" list of component objects. Used to recursively loop through all components in a layout irrespective of nesting.
	 * @param  {Object<MivaLayoutComponentTree>} components - A <MivaLayoutComponentTree> instance with nested components via the "children" property.
	 * @return {Object<Array>} - The "flattened" list of components.
	 */
	_createFlatComponentsList( components ) {

		return components.reduce(( flat, component ) => {

			return flat.concat( component, this._createFlatComponentsList( component.children ) );

		}, []);

	}


	_createStore( defaultComponentStateDataFactory ) {

		return this.$components.reduce(( defaultStateAccumulator, component ) => {

			return {
				...defaultStateAccumulator,
				[ component.id ]: {
					...defaultComponentStateDataFactory( component ),
					__attributes__: objectHash( component.attributes )
				}
			};

		}, {});

	}

	_findSettingsComponent( componentTree ) {

		if ( !(componentTree instanceof MivaLayoutComponentTree) ) {
			throw new TypeError( '[MivaLayout] - "componentTree" is not a MivaLayoutComponentTree instance' );
		}

		let settingsComponent = componentTree.groupByType( this.options.settingsComponentCode ).first();

		if ( settingsComponent != undefined ) {

			if ( this.options.pullSettingsComponent ) {

				_pull( componentTree, settingsComponent );

			}

			return ( this.options.exposeFullSettingsComponent ) ? settingsComponent : { ...settingsComponent.attributes, $componentId: settingsComponent.id };

		}

		if ( !this.options.suppressWarnings ) {
			console.warn( `[MivaLayout] - unable to find "settings" component "${ this.options.settingsComponentCode }"` );
		}

		return {};

	}

	/* ================================ Special Methods ================================ */

	/**
	 * Customize JSON stringify output for the <MivaLayout> instance
	 * @return {Object<Array>}
	 */
	toJSON() {

		return this.components;

	}

};

/* ================================ Static Properties ================================ */

MivaLayout.Component = MivaLayoutComponent;

MivaLayout.ComponentTree = MivaLayoutComponentTree;

/* ================================ Export ================================ */

export default MivaLayout;