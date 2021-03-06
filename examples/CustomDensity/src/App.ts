/*
 * Copyright (c) 2016 David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */

namespace LiteMol.Custom {
    
    import Plugin = LiteMol.Plugin;
    import Views = Plugin.Views;
    import Bootstrap = LiteMol.Bootstrap;            
    import Transformer = Bootstrap.Entity.Transformer;
    import LayoutRegion = Bootstrap.Components.LayoutRegion;
               
    export function create(target: HTMLElement) {
        
        let spec: Plugin.Specification = {
            settings: {
                'density.defaultVisualBehaviourRadius': 5
            },
            transforms: [                
                { transformer: Transformer.Molecule.CreateVisual, view: Views.Transform.Molecule.CreateVisual },
                { transformer: Transformer.Density.CreateVisualBehaviour, view: Views.Transform.Density.CreateVisualBehaviour },

                { transformer: DownloadAndCreate, view: LiteMol.Plugin.Views.Transform.Data.WithIdField, initiallyCollapsed: false }
            ],
            behaviours: [
                // you will find the source of all behaviours in the Bootstrap/Behaviour directory
                
                // keep these 2
                Bootstrap.Behaviour.SetEntityToCurrentWhenAdded,
                Bootstrap.Behaviour.FocusCameraOnSelect,
                
                // this colors the visual when it's selected by mouse or touch
                Bootstrap.Behaviour.ApplyInteractivitySelection,
                
                // this shows what atom/residue is the pointer currently over
                Bootstrap.Behaviour.Molecule.HighlightElementInfo,
                
                // distance to the last "clicked" element
                Bootstrap.Behaviour.Molecule.DistanceToLastClickedElement,

                // when somethinh is selected, this will create an "overlay visual" of the selected residue and show every other residue within 5ang
                // you will not want to use this for the ligand pages, where you create the same thing this does at startup
                Bootstrap.Behaviour.Molecule.ShowInteractionOnSelect(5),
                
                // this tracks what is downloaded and some basic actions. Does not send any private data etc.
                // While it is not required for any functionality, we as authors are very much interested in basic 
                // usage statistics of the application and would appriciate if this behaviour is used.
                Bootstrap.Behaviour.GoogleAnalytics('UA-77062725-1')
            ],            
            components: [
                Plugin.Components.Visualization.HighlightInfo(LayoutRegion.Main, true),               

                //Plugin.Components.create('RepresentationControls', ctx => new Bootstrap.Components.Transform.Action(ctx, 'model', CreateRepresentation, 'Source'), Plugin.Views.Transform.Action)(LayoutRegion.Right),
                Plugin.Components.create('SourceControls', ctx => new Bootstrap.Components.Transform.Action(ctx, ctx.tree.root, DownloadAndCreate, 'Source'), Plugin.Views.Transform.Action)(LayoutRegion.Right),

                Plugin.Components.create('DensityControls', ctx => new Bootstrap.Components.Transform.Updater(ctx, 'density-2fo-fc', 'Density: 2Fo-Fc'), Plugin.Views.Transform.Updater)(LayoutRegion.Right),

                Plugin.Components.Context.Log(LayoutRegion.Bottom, true),
                Plugin.Components.Context.Overlay(LayoutRegion.Root),
                Plugin.Components.Context.BackgroundTasks(LayoutRegion.Main, true)
            ],
            viewport: {
                // dont touch this either 
                view: Views.Visualization.Viewport,
                controlsView: Views.Visualization.ViewportControls
            },
            layoutView: Views.Layout, // nor this
            tree: void 0 //{ region: LayoutRegion.Left, view: Views.Entity.Tree }
        };

        let plugin = new Plugin.Instance(spec, target);
        plugin.context.logger.message(`LiteMol Plugin ${Plugin.VERSION.number}`);
        return plugin;
    }
    
    // create the instance...
    
    let id = '1cbs';
    let plugin = create(document.getElementById('app')!);

    LiteMol.Bootstrap.Command.Layout.SetState.dispatch(plugin.context, { isExpanded: true });

    let action = Bootstrap.Tree.Transform.build();    
    action.add(plugin.context.tree.root, DownloadAndCreate, { id });
    Bootstrap.Tree.Transform.apply(plugin.context, action).run(plugin.context);        
}