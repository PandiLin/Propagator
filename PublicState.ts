
import { Cell } from './Cell/Cell';
import { is_relation, make_relation, Relation } from './DataTypes/Relation';
import { Propagator } from './Propagator';
import { construct_simple_generic_procedure, define_generic_procedure_handler } from 'generic-handler/GenericProcedure';
import { make_layered_procedure } from 'sando-layer/Basic/LayeredProcedure';
import { merge } from './Cell/Merge';
import { all_match, match_args } from 'generic-handler/Predicates';
import {  type InterestedType } from './DataTypes/Relation';
import { inspect } from 'bun';
import { guarantee_type, guard, throw_error } from 'generic-handler/built_in_generics/other_generic_helper';
import { isFunction } from 'rxjs/internal/util/isFunction';
import { is_layered_object } from './temp_predicates';
import { get_base_value } from 'sando-layer/Basic/Layer';
import { construct_stateful_reactor, type StatefulReactor } from './Reactor';
import { pipe } from 'fp-ts/function';
import { filter, tap, map } from './Reactor';
export enum PublicStateCommand{
    ADD_CELL = "add_cell",
    ADD_PROPAGATOR = "add_propagator",
    ADD_CHILD = "add_child",
    SET_PARENT = "set_parent",
    SET_CELLS = "set_cells",
    ADD_AMB_PROPAGATOR = "add_amb_propagator"
}

export interface PublicStateMessage{
    command: PublicStateCommand;
    args: any[];
    summarize: () => string;
}

export function public_state_message(command: PublicStateCommand, ...args: any[]): PublicStateMessage{
    function get_command(){
        return command;
    }

    function get_args(){
        return args;
    } 

    function summarize(){
        const args_summarize = ( args[0] instanceof Cell) || (args[0] instanceof Propagator) ? args[0].summarize() : inspect(args);

        return  "command: " + get_command() + " args: " + args_summarize;
    }

    return {
        command: get_command(),
        args: get_args(),
        summarize: summarize
    }
}


var parent: StatefulReactor<Relation> = construct_stateful_reactor<Relation>(make_relation("root", null));
// Todo: make this read only
const all_cells: StatefulReactor<Cell[]> = construct_stateful_reactor<Cell[]>([]);
const all_propagators: StatefulReactor<Propagator[]> = construct_stateful_reactor<Propagator[]>([]);
const all_amb_propagators: StatefulReactor<Propagator[]> = construct_stateful_reactor<Propagator[]>([]);


const receiver : StatefulReactor<PublicStateMessage> = construct_stateful_reactor<PublicStateMessage>(public_state_message(PublicStateCommand.ADD_CELL, []));

receiver.subscribe((msg: PublicStateMessage) => {
    switch(msg.command){
        case PublicStateCommand.ADD_CELL:
            all_cells.next([...all_cells.get_value(), ...msg.args]);
            break;

        case PublicStateCommand.ADD_PROPAGATOR:
            all_propagators.next([...all_propagators.get_value(), ...msg.args]);
            break;

        case PublicStateCommand.ADD_CHILD:
            if (msg.args.length == 1){
                msg.args[0].add_child(msg.args[0]);
            }
            else if (msg.args.length == 2){ 
                const child = msg.args[0];
                const parent = msg.args[1];
                parent.next(parent.get_value().add_child(child));
            }
            else{
                throw_error(
                    "add_error:",
                    "add_child expects 1 or 2 arguments, got " + msg.args.length,
                    msg.summarize()
                );
            }
            break;
        case PublicStateCommand.SET_PARENT:
            guard(msg.args.length == 1, throw_error(
                "add_error:",
                "set_parent expects 1 argument, got " + msg.args.length,
                msg.summarize()
            ));
            parent = msg.args[0];
            break;
        case PublicStateCommand.SET_CELLS:
            guard(msg.args.length == 1, throw_error(
                "add_error:",
                "set_cell expects 1 argument, got " + msg.args.length,
                msg.summarize()
            ));
            guard(isFunction(msg.args[0]), throw_error(
                "add_error:",
                "set_cell expects a function, got " + msg.args[0],
                msg.summarize()
            ));
            all_cells.next(msg.args[0](all_cells.get_value()));
            break;
        case PublicStateCommand.ADD_AMB_PROPAGATOR:
            all_amb_propagators.next([...all_amb_propagators.get_value(), ...msg.args]);
            break;
    }
})

export function set_global_state(type: PublicStateCommand, ...args: any[]){
    // altering global state should be very careful, so i intentionally make the operation observable
    const msg = public_state_message(type, ...args);
    receiver.next(msg);
} 


export function get_global_parent(){
    return parent.get_value();
}

export const observe_all_cells_update = (observeCommand: (msg: PublicStateMessage) => void, 
                                  observeCell: (cell: Cell) => void) => {
    pipe(receiver,
        filter((msg: PublicStateMessage) => msg.command === PublicStateCommand.ADD_CELL), 
        filter((msg: PublicStateMessage) => msg.args.length == 1 && msg.args[0] instanceof Cell),
        tap((msg: PublicStateMessage) => {
            observeCommand(msg);
            return msg
        }))
    .subscribe((msg: PublicStateMessage) => {
        const cell = msg.args[0]; 
        guard((cell instanceof Cell), throw_error(
            "observe_all_cells", 
            "observe_all_cells expects a cell, got " + cell, 
            msg.summarize()
        ));
        observeCell(cell);
    })
                
}

export const observe_cell_array = all_cells
export const observe_propagator_array = all_propagators
export const observe_amb_propagator_array = all_amb_propagators

export const is_equal = construct_simple_generic_procedure("is_equal", 2,
    (a: any, b: any) => {
        return a === b;
    }
)

define_generic_procedure_handler(is_equal,
    all_match(is_layered_object),
    (a: any, b: any) => {
        // TODO: this is not correct, because it does not consider the layered structure of the objects
        return get_base_value(a) === get_base_value(b);
    }
)






export const is_unusable_value = construct_simple_generic_procedure("is_unusable_value", 1,
    (value: any) => {
        return false;
    }
)

export const value_imples = construct_simple_generic_procedure("value_imples", 2,
    (a: any, b: any) => {
        return a === b;
    }
)

export const merge_layered = make_layered_procedure("merge_layered", 2, merge)

