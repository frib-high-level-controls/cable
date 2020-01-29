/**
 * These type definition are shared by the client and server.
 */

// tslint:disable:no-namespace
declare namespace webapi {
  // Common 'package' for API requests and responses data.
  // Inspired by the following specifications (especially the Google style guide):
  //   http://labs.omniti.com/labs/jsend
  //   https://google.github.io/styleguide/jsoncstyleguide.xml
  export interface Pkg<T> {
    data: T;
    error?: PkgError;
  }

  export interface PkgError {
    // Numeric status code (ie HTTP status code).
    code: number;
    // Description of the error to display to the user.
    message: string;
    // Optional error details.
    errors?: PkgErrorDetail[];
  }

  export interface PkgErrorDetail {
    // Identifies the type of error (ie 'ValidationError').
    reason?: string;
    // Description of the error to display to the user.
    message: string;
    // The location of the error. (Indicates a portion
    // of the request data to which this error applies.)
    location: string;
  }

  // Application specific types defined below.
  export interface CableRequest {
    _id: string

    basic: {
      project: string;
      engineer?: string;
      wbs: string;
      originCategory: string;
      originSubcategory: string;
      signalClassification: string;
      cableType?: string,
      service?: string,
      traySection?: string;
      tags?: string[];
      quantity: number;
    };

    from: {
      rack?: string;
      terminationDevice?: string,
      terminationType?: string,
      terminationPort?: string,
      wiringDrawing?: string,
      label?: string,
    };

    to: {
      rack?: string;
      terminationDevice?: string;
      terminationType?: string;
      terminationPort?: string;
      wiringDrawing?: string;
      label?: string;
    };

    required?: {
      label?: boolean;
      benchTerm?: boolean;
      benchTest?: boolean;
      fieldTerm?: boolean;
    };

    ownerProvided: boolean;

    length?: number;
    conduit?: string;
    routing?: Array<{}>;

    comments?: string;
    status?: number;
    createdBy?: string;
    createdOn?: string;
    updatedBy?: string;
    updatedOn?: string;
    submittedBy?: string;
    submittedOn?: string;
    revertedBy?: string;
    revertedOn?: string;
    approvedBy?: string;
    approvedOn?: string;
    rejectedBy?: string;
    rejectedOn?: string;
  }

  export interface Update {
    property?: string;
    oldValue?: {} | null;
    newValue?: {};
  }

  export interface Change extends Update {
    cableName?: string;
    updatedBy?: string;
    updatedOn?: string;
  }

  export interface MultiChange {
    cableName?: string;
    updates?: Update[];
    updatedBy?: string;
    updatedOn?: string;
  }
}
