/*
 * Copyright (c) 2016 David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */
var LiteMol;
(function (LiteMol) {
    var Surface;
    (function (Surface) {
        var Plugin = LiteMol.Plugin;
        var Query = LiteMol.Core.Structure.Query;
        var Views = Plugin.Views;
        var Bootstrap = LiteMol.Bootstrap;
        var Transformer = Bootstrap.Entity.Transformer;
        var LayoutRegion = Bootstrap.Components.LayoutRegion;
        function create(target) {
            var spec = {
                settings: {},
                transforms: [],
                behaviours: [
                    // you will find the source of all behaviours in the Bootstrap/Behaviour directory
                    Bootstrap.Behaviour.SetEntityToCurrentWhenAdded,
                    Bootstrap.Behaviour.FocusCameraOnSelect,
                    Bootstrap.Behaviour.UnselectElementOnRepeatedClick,
                    // this colors the visual when a selection is created on it.
                    //Bootstrap.Behaviour.ApplySelectionToVisual,
                    // this colors the visual when it's selected by mouse or touch
                    Bootstrap.Behaviour.ApplyInteractivitySelection,
                    // this shows what atom/residue is the pointer currently over
                    Bootstrap.Behaviour.Molecule.HighlightElementInfo,
                    // distance to the last "clicked" element
                    Bootstrap.Behaviour.Molecule.DistanceToLastClickedElement,
                    // when somethinh is selected, this will create an "overlay visual" of the selected residue and show every other residue within 5ang
                    // you will not want to use this for the ligand pages, where you create the same thing this does at startup
                    //Bootstrap.Behaviour.Molecule.ShowInteractionOnSelect(5),                
                    // this tracks what is downloaded and some basic actions. Does not send any private data etc.
                    // While it is not required for any functionality, we as authors are very much interested in basic 
                    // usage statistics of the application and would appriciate if this behaviour is used.
                    Bootstrap.Behaviour.GoogleAnalytics('UA-77062725-1')
                ],
                components: [
                    Plugin.Components.Visualization.HighlightInfo(LayoutRegion.Main, true),
                    Plugin.Components.Context.Log(LayoutRegion.Bottom, true),
                    Plugin.Components.Context.Overlay(LayoutRegion.Root),
                    Plugin.Components.Context.BackgroundTasks(LayoutRegion.Main, true)
                ],
                viewport: {
                    view: Views.Visualization.Viewport,
                    controlsView: Views.Visualization.ViewportControls
                },
                layoutView: Views.Layout,
                tree: { region: LayoutRegion.Left, view: Views.Entity.Tree }
            };
            var plugin = new Plugin.Instance(spec, target);
            plugin.context.logger.message("LiteMol " + Plugin.VERSION.number);
            return plugin;
        }
        Surface.create = create;
        var id = '1cbs';
        var plugin = create(document.getElementById('app'));
        LiteMol.Bootstrap.Command.Layout.SetState.dispatch(plugin.context, {
            // isExpanded: true,
            hideControls: true
        });
        /**
         * Selection of a specific set of atoms...
         */
        var selectionQ = Query.residuesByName('REA'); // for atoms identifier array, use Query.atomsById.apply(null, [1,2,3,4,5,6]);
        var selectionColors = Bootstrap.Immutable.Map()
            .set('Uniform', LiteMol.Visualization.Color.fromHex(0xff0000))
            .set('Selection', LiteMol.Visualization.Theme.Default.SelectionColor)
            .set('Highlight', LiteMol.Visualization.Theme.Default.HighlightColor);
        var selectionStyle = {
            type: 'Surface',
            params: { probeRadius: 0, density: 1.25, smoothing: 3, isWireframe: false },
            theme: { template: Bootstrap.Visualization.Molecule.Default.UniformThemeTemplate, colors: selectionColors, transparency: { alpha: 0.4 } }
        };
        /**
         * Selection of the complement of the previous set.
         */
        var complementQ = selectionQ.complement();
        var complementColors = selectionColors.set('Uniform', LiteMol.Visualization.Color.fromHex(0x666666));
        var complementStyle = {
            type: 'Surface',
            params: { probeRadius: 0, density: 1.25, smoothing: 3, isWireframe: false },
            theme: { template: Bootstrap.Visualization.Molecule.Default.UniformThemeTemplate, colors: complementColors, transparency: { alpha: 1.0 } }
        };
        // Represent an action to perform on the app state.
        var action = Bootstrap.Tree.Transform.build();
        // This loads the model from PDBe
        var modelAction = action.add(plugin.context.tree.root, Transformer.Data.Download, { url: "https://www.ebi.ac.uk/pdbe/static/entry/" + id + "_updated.cif", type: 'String', id: id })
            .then(Transformer.Data.ParseCif, { id: id }, { isBinding: true })
            .then(Transformer.Molecule.CreateFromMmCif, { blockIndex: 0 }, { isBinding: true })
            .then(Transformer.Molecule.CreateModel, { modelIndex: 0 }, { isBinding: false, ref: 'model' });
        // Create a selection on the model and then create a visual for it...
        modelAction
            .then(Transformer.Molecule.CreateSelectionFromQuery, { query: complementQ, name: 'Complement', silent: true }, {})
            .then(Transformer.Molecule.CreateVisual, { style: complementStyle }, { isHidden: true });
        var sel = modelAction
            .then(Transformer.Molecule.CreateSelectionFromQuery, { query: selectionQ, name: 'Selection', silent: true }, {});
        sel.then(Transformer.Molecule.CreateVisual, { style: Bootstrap.Visualization.Molecule.Default.ForType.get('BallsAndSticks') }, { isHidden: true });
        sel.then(Transformer.Molecule.CreateVisual, { style: selectionStyle }, { isHidden: true });
        var loadTask = Bootstrap.Tree.Transform.apply(plugin.context, action).run(plugin.context);
        // to access the model after it was loaded...
        loadTask.then(function () {
            var model = plugin.context.select('model')[0];
            if (!model)
                return;
            console.log(model.props.model);
            Bootstrap.Command.Molecule.FocusQuery.dispatch(plugin.context, { model: model, query: selectionQ });
        });
    })(Surface = LiteMol.Surface || (LiteMol.Surface = {}));
})(LiteMol || (LiteMol = {}));
