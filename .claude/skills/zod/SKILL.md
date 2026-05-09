---
name: zod
description: TypeScript-first schema validation and type inference. Use for validating API requests/responses, form data, env vars, configs, defining type-safe schemas with runtime validation, transforming data, generating JSON Schema for OpenAPI/AI, or encountering missing validation errors, type inference issues, validation error handling problems. Zero dependencies (2kb gzipped).
license: MIT
metadata:
  version: 2.0.0
  last_verified: 2025-11-17
  package_version: 4.3.6+
  keywords:
    - zod
    - validation
    - schema
    - typescript
    - type-safety
    - runtime-validation
    - type-inference
    - data-validation
    - form-validation
    - api-validation
    - json-schema
    - refinement
    - transformation
    - error-handling
    - parse
    - safeParse
    - z.object
    - z.string
    - z.number
    - z.array
    - z.union
    - z.discriminatedUnion
    - z.refine
    - z.transform
    - z.infer
    - z.coerce
    - z.enum
    - z.literal
    - z.tuple
    - z.record
    - z.intersection
    - z.codec
    - z.toJSONSchema
    - z.treeifyError
    - z.flattenError
    - z.prettifyError
    - z.registry
    - z.globalRegistry
    - .register
    - .meta
    - error-customization
    - localization
    - i18n
    - migration
    - v3-to-v4
    - breaking-changes
    - tRPC
    - prisma-zod
    - react-hook-form
    - trpc
    - environment-variables
    - env-validation
    - config-validation
    - dto
    - type-guard
    - runtime-type-checking
  token_savings: 65%
  errors_prevented: 8
  production_tested: true
  related_skills:
    - react-hook-form-zod
    - typescript-mcp
---

# Zod: TypeScript-First Schema Validation

## Overview

Zod is a TypeScript-first validation library that enables developers to define schemas for validating data at runtime while automatically inferring static TypeScript types. With zero dependencies and a 2kb core bundle (gzipped), Zod provides immutable, composable validation with comprehensive error handling.

## Core Concepts

### Basic Usage Pattern

```typescript
import { z } from "zod";

// Define schema
const UserSchema = z.object({
  username: z.string(),
  age: z.number().int().positive(),
  email: z.string().email(),
});

// Infer TypeScript type
type User = z.infer<typeof UserSchema>;

// Validate data (throws on error)
const user = UserSchema.parse(data);

// Validate data (returns result object)
const result = UserSchema.safeParse(data);
if (result.success) {
  console.log(result.data); // Typed!
} else {
  console.error(result.error); // ZodError
}
```

### Parsing Methods

Use the appropriate parsing method based on error handling needs:

- **`.parse(data)`** - Throws `ZodError` on invalid input; returns strongly-typed data on success
- **`.safeParse(data)`** - Returns `{ success: true, data }` or `{ success: false, error }` (no exceptions)
- **`.parseAsync(data)`** - For schemas with async refinements/transforms
- **`.safeParseAsync(data)`** - Async version that doesn't throw

**Best Practice**: Use `.safeParse()` to avoid try-catch blocks and leverage discriminated unions.

## Primitive Types

### Strings

```typescript
z.string()                    // Basic string
z.string().min(5)            // Minimum length
z.string().max(100)          // Maximum length
z.string().length(10)        // Exact length
z.string().email()           // Email validation
z.string().url()             // URL validation
z.string().uuid()            // UUID format
z.string().regex(/^\d+$/)    // Custom pattern
z.string().startsWith("pre") // Prefix check
z.string().endsWith("suf")   // Suffix check
z.string().trim()            // Auto-trim whitespace
z.string().toLowerCase()     // Auto-lowercase
z.string().toUpperCase()     // Auto-uppercase

// ISO formats (Zod 4+)
z.iso.date()                 // YYYY-MM-DD
z.iso.time()                 // HH:MM:SS
z.iso.datetime()             // ISO 8601 datetime
z.iso.duration()             // ISO 8601 duration

// Network formats
z.ipv4()                     // IPv4 address
z.ipv6()                     // IPv6 address
z.cidrv4()                   // IPv4 CIDR notation
z.cidrv6()                   // IPv6 CIDR notation

// Other formats
z.jwt()                      // JWT token
z.nanoid()                   // Nanoid
z.cuid()                     // CUID
z.cuid2()                    // CUID2
z.ulid()                     // ULID
z.base64()                   // Base64 encoded
z.hex()                      // Hexadecimal
```

### Numbers

```typescript
z.number()                   // Basic number
z.number().int()             // Integer only
z.number().positive()        // > 0
z.number().nonnegative()     // >= 0
z.number().negative()        // < 0
z.number().nonpositive()     // <= 0
z.number().min(0)            // Minimum value
z.number().max(100)          // Maximum value
z.number().gt(0)             // Greater than
z.number().gte(0)            // Greater than or equal
z.number().lt(100)           // Less than
z.number().lte(100)          // Less than or equal
z.number().multipleOf(5)     // Must be multiple of 5
z.int()                      // Shorthand for z.number().int()
z.int32()                    // 32-bit integer
z.nan()                      // NaN value
```

### Coercion (Type Conversion)

```typescript
z.coerce.string()            // Convert to string
z.coerce.number()            // Convert to number
z.coerce.boolean()           // Convert to boolean
z.coerce.bigint()            // Convert to bigint
z.coerce.date()              // Convert to Date

// Example: Parse query parameters
const QuerySchema = z.object({
  page: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().max(100).default(10),
});

// "?page=5&limit=20" -> { page: 5, limit: 20 }
```

### Other Primitives

```typescript
z.boolean()                  // Boolean
z.date()                     // Date object
z.date().min(new Date("2020-01-01"))
z.date().max(new Date("2030-12-31"))
z.bigint()                   // BigInt
z.symbol()                   // Symbol
z.null()                     // Null
z.undefined()                // Undefined
z.void()                     // Void (undefined)
```

## Complex Types

### Objects

```typescript
const PersonSchema = z.object({
  name: z.string(),
  age: z.number(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    country: z.string(),
  }),
});

type Person = z.infer<typeof PersonSchema>;

// Object methods
PersonSchema.shape                 // Access shape
PersonSchema.keyof()              // Get union of keys
PersonSchema.extend({ role: z.string() })  // Add fields
PersonSchema.pick({ name: true }) // Pick specific fields
PersonSchema.omit({ age: true })  // Omit fields
PersonSchema.partial()            // Make all fields optional
PersonSchema.required()           // Make all fields required
PersonSchema.deepPartial()        // Recursively optional

// Strict vs loose objects
z.strictObject({ ... })           // No extra keys allowed (throws)
z.object({ ... })                 // Strips extra keys (default)
z.looseObject({ ... })            // Allows extra keys
```

### Arrays

```typescript
z.array(z.string())              // String array
z.array(z.number()).min(1)       // At least 1 element
z.array(z.number()).max(10)      // At most 10 elements
z.array(z.number()).length(5)    // Exactly 5 elements
z.array(z.number()).nonempty()   // At least 1 element

// Nested arrays
z.array(z.array(z.number()))     // number[][]
```

### Tuples

```typescript
z.tuple([z.string(), z.number()]) // [string, number]
z.tuple([z.string(), z.number()]).rest(z.boolean()) // [string, number, ...boolean[]]
```

### Enums and Literals

```typescript
// Enum
const RoleEnum = z.enum(["admin", "user", "guest"]);
type Role = z.infer<typeof RoleEnum>; // "admin" | "user" | "guest"

// Literal values
z.literal("exact_value")
z.literal(42)
z.literal(true)

// Native TypeScript enum
enum Fruits {
  Apple,
  Banana,
}
z.nativeEnum(Fruits)

// Enum methods
RoleEnum.enum.admin              // "admin"
RoleEnum.exclude(["guest"])      // Exclude values
RoleEnum.extract(["admin", "user"]) // Include only
```

### Unions

```typescript
// Basic union
z.union([z.string(), z.number()])

// Discriminated union (better performance & type inference)
const ResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.any() }),
  z.object({ status: z.literal("error"), message: z.string() }),
]);

type Response = z.infer<typeof ResponseSchema>;
// { status: "success", data: any } | { status: "error", message: string }
```

### Intersections

```typescript
const BaseSchema = z.object({ id: z.string() });
const ExtendedSchema = z.object({ name: z.string() });

const Combined = z.intersection(BaseSchema, ExtendedSchema);
// Equivalent to: z.object({ id: z.string(), name: z.string() })
```

### Records and Maps

```typescript
// Record: object with typed keys and values
z.record(z.string())             // { [key: string]: string }
z.record(z.string(), z.number()) // { [key: string]: number }

// Partial record (some keys optional)
z.partialRecord(z.enum(["a", "b"]), z.string())

// Map
z.map(z.string(), z.number())    // Map<string, number>
z.set(z.string())                // Set<string>
```

## Advanced Patterns

**Load `references/advanced-patterns.md` for complete advanced validation and transformation patterns.**

### Quick Reference

**Refinements** (custom validation):
```typescript
z.string().refine((val) => val.length >= 8, "Too short");
z.object({ password, confirmPassword }).superRefine((data, ctx) => { /* ... */ });
```

**Transformations** (modify data):
```typescript
z.string().transform((val) => val.trim());
z.string().pipe(z.coerce.number());
```

**Codecs** (bidirectional transforms - NEW in v4.1):
```typescript
const DateCodec = z.codec(
  z.iso.datetime(),
  z.date(),
  {
    decode: (str) => new Date(str),
    encode: (date) => date.toISOString(),
  }
);
```

**Recursive Types**:
```typescript
const CategorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({ name: z.string(), subcategories: z.array(CategorySchema) })
);
```

**Optional/Nullable**:
```typescript
z.string().optional()            // string | undefined
z.string().nullable()            // string | null
z.string().default("default")    // Provides default if undefined
```

**Readonly & Brand**:
```typescript
z.object({ ... }).readonly()     // Readonly properties
z.string().brand<"UserId">()     // Nominal typing
```

**→ Load `references/advanced-patterns.md` for:** Complete refinement patterns, async validation, codec examples, composable schemas, conditional validation, performance optimization

## Error Handling

**Load `references/error-handling.md` for complete error formatting and customization guide.**

### Quick Reference

**Error Formatting Methods**:
```typescript
// For forms
const { fieldErrors } = z.flattenError(error);

// For nested data
const tree = z.treeifyError(error);
const nameError = tree.properties?.user?.properties?.name?.errors?.[0];

// For debugging
console.log(z.prettifyError(error));
```

**Custom Error Messages** (three levels):
```typescript
// 1. Schema-level (highest priority)
z.string({ error: "Custom message" });
z.string().min(5, "Too short");

// 2. Per-parse level
schema.parse(data, { error: (issue) => ({ message: "..." }) });

// 3. Global level
z.config({ customError: (issue) => ({ message: "..." }) });
```

**Localization** (40+ languages):
```typescript
z.config(z.locales.es());  // Spanish
z.config(z.locales.fr());  // French
```

**→ Load `references/error-handling.md` for:** Complete error formatting examples, custom error patterns, localization setup, error code reference

## Type Inference

**Load `references/type-inference.md` for complete type inference and metadata documentation.**

### Quick Reference

**Basic Type Inference**:
```typescript
const UserSchema = z.object({ name: z.string() });
type User = z.infer<typeof UserSchema>; // { name: string }
```

**Input vs Output** (for transforms):
```typescript
const TransformSchema = z.string().transform((s) => s.length);
type Input = z.input<typeof TransformSchema>;   // string
type Output = z.output<typeof TransformSchema>; // number
```

**JSON Schema Conversion**:
```typescript
const jsonSchema = z.toJSONSchema(UserSchema, {
  target: "openapi-3.0",
  metadata: true,
});
```

**Metadata**:
```typescript
// Add metadata
const EmailSchema = z.string().email().meta({
  title: "Email Address",
  description: "User's email address",
});

// Create custom registry
const formRegistry = z.registry<FormFieldMeta>();
```

**→ Load `references/type-inference.md` for:** Complete type inference patterns, JSON Schema options, metadata system, custom registries, brand types

## Functions

Validate function inputs and outputs:

```typescript
const AddFunction = z.function()
  .args(z.number(), z.number())  // Arguments
  .returns(z.number());           // Return type

// Implement typed function
const add = AddFunction.implement((a, b) => {
  return a + b; // Type-checked!
});

// Async functions
const FetchFunction = z.function()
  .args(z.string())
  .returns(z.promise(z.object({ data: z.any() })))
  .implementAsync(async (url) => {
    const response = await fetch(url);
    return response.json();
  });
```

## Common Patterns

### Environment Variables

```typescript
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3000),
  API_KEY: z.string().min(32),
});

// Validate on startup
const env = EnvSchema.parse(process.env);

// Now use typed env
console.log(env.PORT); // number
```

### Form Validation

```typescript
const FormSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("Invalid email"),
  age: z.coerce.number().int().min(18, "Must be 18+"),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: "Must accept terms" }),
  }),
});

type FormData = z.infer<typeof FormSchema>;
```

### Partial Updates

```typescript
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

// For PATCH requests: make everything optional except id
const UpdateUserSchema = UserSchema.partial().required({ id: true });

type UpdateUser = z.infer<typeof UpdateUserSchema>;
// { id: string; name?: string; email?: string }
```

### Composable Schemas

```typescript
// Base schemas
const TimestampSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

const AuthorSchema = z.object({
  authorId: z.string(),
  authorName: z.string(),
});

// Compose into larger schemas
const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
}).merge(TimestampSchema).merge(AuthorSchema);
```

## Ecosystem Integration

**React Hook Form** — this project uses `@hookform/resolvers` with Zod schemas for shared client + server validation. Load `references/ecosystem-integrations.md` for integration details.

## Troubleshooting

**Load `references/troubleshooting.md` for complete troubleshooting guide, performance tips, and best practices.**

### Quick Reference

**Common Issues**:
1. TypeScript strict mode required → Enable in `tsconfig.json`
2. Large bundle size → Use `z.lazy()` for code splitting
3. Slow async refinements → Cache or debounce
4. Circular dependencies → Use `z.lazy()`
5. Slow unions → Use `z.discriminatedUnion()`
6. Transform vs refine confusion → Use `.refine()` for validation, `.transform()` for modification

**Performance Tips**:
- Use `.discriminatedUnion()` (5-10x faster than `.union()`)
- Cache schema instances
- Use `.safeParse()` (avoids try-catch overhead)
- Lazy load large schemas

**Best Practices**:
- Define schemas at module level
- Use type inference (`z.infer`)
- Add custom error messages
- Validate at system boundaries
- Compose small schemas
- Document with `.meta()`

**→ Load `references/troubleshooting.md` for:** Detailed solutions, performance optimization, best practices, testing patterns

## Quick Reference

```typescript
// Primitives
z.string(), z.number(), z.boolean(), z.date(), z.bigint()

// Collections
z.array(), z.tuple(), z.object(), z.record(), z.map(), z.set()

// Special types
z.enum(), z.union(), z.discriminatedUnion(), z.intersection()
z.literal(), z.any(), z.unknown(), z.never()

// Modifiers
.optional(), .nullable(), .nullish(), .default(), .catch()
.readonly(), .brand()

// Validation
.min(), .max(), .length(), .regex(), .email(), .url(), .uuid()
.refine(), .superRefine()

// Transformation
.transform(), .pipe(), .codec()

// Parsing
.parse(), .safeParse(), .parseAsync(), .safeParseAsync()

// Type inference
z.infer<typeof Schema>, z.input<typeof Schema>, z.output<typeof Schema>

// Error handling
z.flattenError(), z.treeifyError(), z.prettifyError()

// JSON Schema
z.toJSONSchema(schema, options)

// Metadata
.meta(), .describe()

// Object methods
.extend(), .pick(), .omit(), .partial(), .required(), .merge()
```

## When to Load References

**Load `references/error-handling.md` when:**
- Need to format errors for forms or UI
- Implementing custom error messages
- Questions about `z.flattenError()`, `z.treeifyError()`, or `z.prettifyError()`
- Setting up localization for error messages
- Need error code reference or pattern examples

**Load `references/advanced-patterns.md` when:**
- Implementing custom refinements or async validation
- Need bidirectional transformations (codecs)
- Working with recursive types or self-referential data
- Questions about `.refine()`, `.transform()`, or `.codec()`
- Need performance optimization patterns
- Implementing conditional validation

**Load `references/type-inference.md` when:**
- Questions about TypeScript type inference
- Need to generate JSON Schema for OpenAPI or AI
- Implementing metadata system for forms or documentation
- Need custom registries for type-safe metadata
- Questions about `z.infer`, `z.input`, `z.output`
- Using brand types for ID safety

**Load `references/ecosystem-integrations.md` when:**
- Integrating with React Hook Form via `@hookform/resolvers`

**Load `references/troubleshooting.md` when:**
- Encountering TypeScript strict mode errors
- Bundle size concerns or lazy loading needs
- Performance issues with large unions or async refinements
- Questions about circular dependencies
- Need best practices or testing patterns
- Confusion between `.refine()` and `.transform()`

## Additional Resources

- **Official Docs**: https://zod.dev
- **GitHub**: https://github.com/colinhacks/zod
