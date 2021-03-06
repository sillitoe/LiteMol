/*
 * Copyright (c) 2016 David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */


namespace LiteMol.Bootstrap.Components.Transform {
    "use strict";
 
    import Vis = Bootstrap.Visualization;
    
    export class MoleculeVisual extends Controller<Bootstrap.Entity.Transformer.Molecule.CreateVisualParams> {          
        updateTemplate(key: string, all: Map<string, Bootstrap.Visualization.AnyStyle>) {                                                
            let s = all.get(key)!; 
            let latestTheme = this.latestState && this.latestState.params!.style!.theme;                 
            let params = s.params;
            let theme = latestTheme || this.getThemeInstance(s.theme!.template!);
            let style: Bootstrap.Visualization.Molecule.Style<any> = { type: s.type, params, theme };
            this.autoUpdateParams({ style });            
        }
        
        updateStyleParams(params: any) {
            let s = Utils.shallowClone(this.latestState.params!.style)!;
            s.params = Utils.merge(s.params, params);            
            this.autoUpdateParams({ style: s })
        }   
        
        updateStyleTheme(theme: Vis.Theme.Instance) {
            let s = Utils.shallowClone(this.latestState.params!.style)!;
            s.theme = Utils.merge(s.theme, theme);
            this.autoUpdateParams({ style: s });
        }
                
        updateThemeColor(name: string, value: LiteMol.Visualization.Color) {            
            let oldTheme = this.latestState.params!.style!.theme;            
            if (!oldTheme) return;           
            let colors = oldTheme.colors;
            if (!colors) colors = Immutable.Map<string, LiteMol.Visualization.Color>();            
            colors = colors.set(name, value);
            this.updateStyleTheme({ colors });    
        }
        
        updateThemeTransparency(transparency: LiteMol.Visualization.Theme.Transparency) {
            let oldTheme = this.latestState.params!.style!.theme;            
            if (!oldTheme) return;
            this.updateStyleTheme({ transparency });    
        }    
                
        private getThemeInstance(template: Bootstrap.Visualization.Theme.Template): Bootstrap.Visualization.Theme.Instance {
            let oldTheme = this.latestState.params!.style!.theme;        
            let defaultTransparency = Bootstrap.Visualization.Molecule.Default.ForType.get(this.latestState.params!.style!.type!)!.theme!.transparency;
            if (!oldTheme) return { template, colors: template.colors, transparency: defaultTransparency };     
            let colors = template.colors;            
            if (oldTheme.colors && colors) {
                colors = colors.withMutations(map => {
                    oldTheme!.colors!.forEach((c, n) => {
                        if (map.has(n!)) map.set(n!, c!);
                    });                    
                });               
            }            
            let transparency = oldTheme.transparency ? oldTheme.transparency : defaultTransparency;            
            return { template, colors, transparency };
        }
        
        updateThemeDefinition(definition: Bootstrap.Visualization.Theme.Template) {            
            this.updateStyleTheme(this.getThemeInstance(definition));
        }       
    }   
    
    
    export class DensityVisual extends Controller<Bootstrap.Entity.Transformer.Density.CreateVisualParams | Bootstrap.Entity.Transformer.Density.CreateVisualBehaviourParams> {        
        
        updateStyleParams(params: any) {
            let s = Utils.shallowClone(this.latestState.params!.style)!;
            s.params = Utils.merge(s.params, params);
            this.autoUpdateParams({ style: s })
        }   
        
        updateStyleTheme(theme: Vis.Theme.Instance) {
            let s = Utils.shallowClone(this.latestState.params!.style)!;
            s.theme = Utils.merge(s.theme, theme);
            this.autoUpdateParams({ style: s })
        }
                
        updateThemeColor(name: string, value: LiteMol.Visualization.Color) {            
            let oldTheme = this.latestState.params!.style!.theme;            
            if (!oldTheme) return;           
            let colors = oldTheme.colors;
            if (!colors) colors = Immutable.Map<string, LiteMol.Visualization.Color>();            
            colors = colors.set(name, value);
            this.updateStyleTheme({ colors });            
        }
        
        updateThemeTransparency(transparency: LiteMol.Visualization.Theme.Transparency) {
            let oldTheme = this.latestState.params!.style!.theme;            
            if (!oldTheme) return;
            this.updateStyleTheme({ transparency });    
        }    
                
        private getThemeInstance(template: Bootstrap.Visualization.Theme.Template): Bootstrap.Visualization.Theme.Instance {
            let oldTheme = this.latestState.params!.style!.theme;        
            let defaultTransparency = Bootstrap.Visualization.Density.Default.Transparency;
            if (!oldTheme) return { template, colors: template.colors, transparency: defaultTransparency };     
            let colors = template.colors;            
            if (oldTheme.colors && colors) {
                colors = colors.withMutations(map => {
                    oldTheme!.colors!.forEach((c, n) => {
                        if (map.has(n!)) map.set(n!, c!);
                    });                    
                });               
            }            
            let transparency = oldTheme.transparency ? oldTheme.transparency : defaultTransparency;            
            return { template, colors, transparency };
        }
        
        updateRadius(radius: number) {
            this.autoUpdateParams({ radius })
        }
        
        updateThemeDefinition(definition: Bootstrap.Visualization.Theme.Template) {            
            this.updateStyleTheme(this.getThemeInstance(definition));
        }     
    }   
}