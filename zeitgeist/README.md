# SubQuery Example - Entity relations

This subquery indexes balance transfers between accounts, it is designed to demonstrate the many-to-many relationship within these entities.
 
This subquery also indexes the utility batchAll calls which are formated in tree structure, and we established an one-to-many relationship within those entities,  allow us to understand the actual actions of this extrinsic and know its position in the tree.

# Get Started
### 1. install dependencies
```shell
yarn
```

### 2. generate types
```shell
yarn codegen
```

### 3. build
```shell
yarn build
```

### 4. run locally
```shell
yarn start:docker
```
